#!/usr/bin/env python3
"""Collect a small sample of public Lightning nodes from the Mempool API."""

import argparse
import json
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


DEFAULT_BASE_URL = "https://mempool.space/api/v1/lightning"
PUBKEY_RE = re.compile(r"^(02|03)[0-9a-fA-F]{64}$")


def get_json(url, timeout):
    for attempt in range(3):
        try:
            request = Request(url, headers={"User-Agent": "RGBSmartWalletResearch/0.1"})
            with urlopen(request, timeout=timeout) as response:
                return json.load(response)
        except HTTPError as exc:
            if exc.code not in (429, 500, 502, 503, 504) or attempt == 2:
                raise
            retry_after = exc.headers.get("Retry-After", "")
            wait = float(retry_after) if retry_after.isdigit() else 2 ** attempt
        except (URLError, TimeoutError):
            if attempt == 2:
                raise
            wait = 2 ** attempt
        time.sleep(min(wait, 30))


def integer_or_none(value):
    if isinstance(value, bool):
        return None
    try:
        number = int(value)
    except (TypeError, ValueError):
        return None
    return number if number >= 0 else None


def normalize_node(raw, country_code):
    pubkey = raw.get("publicKey") or raw.get("public_key")
    if not isinstance(pubkey, str) or not PUBKEY_RE.fullmatch(pubkey):
        return None
    country = raw.get("country")
    city = raw.get("city")
    return {
        "pubkey": pubkey.lower(),
        "alias": raw.get("alias") or "",
        "public_channels": integer_or_none(raw.get("channels")),
        "advertised_capacity_sat": integer_or_none(raw.get("capacity")),
        "first_seen_unix": integer_or_none(raw.get("firstSeen", raw.get("first_seen"))),
        "updated_at_unix": integer_or_none(raw.get("updatedAt", raw.get("updated_at"))),
        "country_code": country_code,
        "country": country.get("en") if isinstance(country, dict) else None,
        "city": city.get("en") if isinstance(city, dict) else None,
    }


def collect(base_url, limit, timeout, delay, selected_countries):
    countries = get_json(f"{base_url}/nodes/countries", timeout)
    if not isinstance(countries, list):
        raise ValueError("La risposta di /nodes/countries non è una lista")
    codes = [item.get("iso") for item in countries if isinstance(item, dict)]
    codes = [code.upper() for code in codes if isinstance(code, str) and re.fullmatch(r"[A-Za-z]{2}", code)]
    if selected_countries:
        codes = [code for code in codes if code in selected_countries]

    nodes = {}
    failed_countries = []
    checked_countries = []
    for code in codes:
        if len(nodes) >= limit:
            break
        if checked_countries:
            time.sleep(delay)
        checked_countries.append(code)
        try:
            country_nodes = get_json(f"{base_url}/nodes/country/{code}", timeout)
            if not isinstance(country_nodes, list):
                raise ValueError("risposta non in formato lista")
        except (HTTPError, URLError, TimeoutError, ValueError) as exc:
            failed_countries.append({"code": code, "error": str(exc)})
            continue
        for raw in country_nodes:
            if not isinstance(raw, dict):
                continue
            node = normalize_node(raw, code)
            if node:
                nodes.setdefault(node["pubkey"], node)
            if len(nodes) >= limit:
                break

    if not nodes:
        raise RuntimeError("Nessun nodo raccolto: controlla rete, endpoint e risposte API")
    return {
        "metadata": {
            "network": "bitcoin_mainnet",
            "source": "Mempool public Lightning API, nodes by country",
            "source_url": base_url,
            "collected_at_utc": datetime.now(timezone.utc).isoformat(),
            "count": len(nodes),
            "requested_limit": limit,
            "countries_checked": checked_countries,
            "failed_countries": failed_countries,
            "selection": "Nodi clearnet geolocalizzati, paesi nell'ordine restituito dall'API; campione non casuale.",
            "caveats": [
                "La capacità annunciata dei canali pubblici non è la liquidità spendibile.",
                "Il gossip pubblico non prova il supporto di uno specifico asset RGB.",
                "Nodi Tor-only, canali privati e saldi remoti non sono inclusi.",
            ],
        },
        "nodes": list(nodes.values()),
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--limit", type=int, default=100, help="Numero massimo di nodi (1-10000, default: 100)")
    parser.add_argument("--output", type=Path, default=Path(__file__).with_name("nodes_api.json"))
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL, help="Base URL dell'API Lightning")
    parser.add_argument("--countries", help="Codici ISO separati da virgole, es. IT,DE")
    parser.add_argument("--delay", type=float, default=0.5, help="Pausa fra richieste ai paesi, in secondi")
    parser.add_argument("--timeout", type=float, default=20, help="Timeout per richiesta, in secondi")
    args = parser.parse_args()
    if not 1 <= args.limit <= 10000:
        parser.error("--limit deve essere fra 1 e 10000")
    if args.delay < 0 or args.timeout <= 0:
        parser.error("--delay deve essere >= 0 e --timeout > 0")
    selected = None
    if args.countries:
        selected = {code.strip().upper() for code in args.countries.split(",")}
        if any(not re.fullmatch(r"[A-Z]{2}", code) for code in selected):
            parser.error("--countries deve contenere codici ISO a due lettere")
    try:
        result = collect(args.base_url.rstrip("/"), args.limit, args.timeout, args.delay, selected)
    except (HTTPError, URLError, TimeoutError, ValueError, RuntimeError) as exc:
        print(f"Errore: {exc}", file=sys.stderr)
        return 1
    args.output.parent.mkdir(parents=True, exist_ok=True)
    temporary = args.output.with_name(args.output.name + ".tmp")
    temporary.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.replace(args.output)
    print(f"Salvati {result['metadata']['count']} nodi in {args.output}")
    if result["metadata"]["failed_countries"]:
        print(f"Paesi con errori: {len(result['metadata']['failed_countries'])}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
