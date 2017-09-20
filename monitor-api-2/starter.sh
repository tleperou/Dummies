#!/bin/sh

if [ $(ps -e -o uid,cmd | grep $UID | grep nvm | grep node | grep -v grep | wc -l | tr -s "\n") -eq 0 ]
then
    node /srv/monitor/app.js >> /srv/monitor/logs/starter.log 2>&1
fi
