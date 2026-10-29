#!/usr/bin/env python3
"""Regenerate docs/ops-data.js from the real Web-Service edition's app.py.
Usage:  python tools/gen_ops_data.py <path/to/app.py> <path/to/docs/ops-data.js>
Needs the app's dependencies importable (pip install flask pypsrp)."""
import sys, json, importlib.util, os
src, dst = sys.argv[1], sys.argv[2]
sys.path.insert(0, os.path.dirname(os.path.abspath(src)))
spec = importlib.util.spec_from_file_location("pcat_app", src)
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
ops = []
for o in m.OPERATIONS:
    meta = next(x for x in m.OPS_META if x["id"] == o["id"])
    ops.append({"id": o["id"], "label": o["label"], "category": o["category"], "description": o["description"],
                "danger": bool(o.get("danger", False)), "long": bool(o.get("long", False)),
                "needs_cred": bool(o.get("needs_cred", False)), "params": meta.get("params", []), "command": o["command"].strip("\n")})
with open(dst, "w", encoding="utf-8") as f:
    f.write("/* generated from the real OPERATIONS list of PC Admin Tool -- %d operations, %d categories */\n" % (len(ops), len(m.CATEGORIES)))
    f.write("window.PCAT_OPS=" + json.dumps(ops, ensure_ascii=False) + ";\n")
    f.write("window.PCAT_CATS=" + json.dumps(m.CATEGORIES, ensure_ascii=False) + ";\n")
print("wrote", dst, len(ops), "ops")
