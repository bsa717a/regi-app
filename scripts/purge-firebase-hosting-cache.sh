#!/usr/bin/env bash
# Purge Firebase Hosting CDN entries that can pin HTML to a previous Cloud Run
# build's hashed /_next/static chunks. Safe to run after every deploy.
set -euo pipefail

hosts=(
  "https://app.regireg.com"
  "https://www.regireg.com"
  "https://regi-app-v1.web.app"
)

paths=(
  "/"
  "/login"
  "/signup"
  "/forgot-password"
  "/garage"
  "/dashboard"
  "/settings"
  "/documents"
  "/renewals"
  "/privacy"
  "/terms"
  "/support"
  "/admin"
  "/admin/users"
  "/admin/search"
  "/admin/renewals"
  "/auth/action"
)

for host in "${hosts[@]}"; do
  for path in "${paths[@]}"; do
    url="${host}${path}"
    code="$(curl -sS -o /dev/null -w "%{http_code}" -X PURGE "$url" || true)"
    echo "PURGE ${code} ${url}"
  done
done
