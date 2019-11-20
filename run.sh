#!/usr/bin/env bash
tsc
pm2 start ecosystem.config.yml
