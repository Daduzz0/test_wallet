#!/usr/bin/env python3
"""Run simple checks on a collected Lightning nodes JSON file."""

import argparse
import json
import re
from collections import Counter
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("file", nargs="?", type=Path, default=Path(__file__).with_name("nodes.json"))
    args = parser.parse_args()
    data = json.loads(args.file.read_text(encoding="utf-8"))
    nodes = data["nodes"]
    keys = [node["pubkey"] for node in nodes]
    invalid = sum(not re.fullmatch(r"(02|03)[0-9a-f]{64}", key) for key in keys)
    duplicate_count = len(keys) - len(set(keys))
    print(f"Nodi: {len(nodes)}")
    print(f"Pubkey non valide: {invalid}; duplicate: {duplicate_count}")

    fields = ("alias", "public_channels", "advertised_capacity_sat", "advertised_capacity_btc_approx", "connection", "country_code")
    for field in fields:
        count = sum(node.get(field) is not None and node.get(field) != "" for node in nodes)
        print(f"{field}: {count}/{len(nodes)}")

    channel_counts = [node["public_channels"] for node in nodes if isinstance(node.get("public_channels"), int)]
    if channel_counts:
        print(f"Canali pubblici per nodo: min={min(channel_counts)}, max={max(channel_counts)}")
    for field in ("connection", "country_code"):
        values = Counter(node[field] for node in nodes if node.get(field))
        if values:
            print(f"{field}: {dict(values.most_common(5))}")

    if invalid or duplicate_count or len(nodes) > 10000 or data["metadata"]["count"] != len(nodes):
        raise SystemExit("Controlli di integrità falliti")


if __name__ == "__main__":
    main()
