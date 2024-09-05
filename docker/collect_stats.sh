#!/bin/bash

_STATS_FILE=${STATS_FILE:-"docker_stats.log"}
_CONTAINER_NAME=${CONTAINER_NAME:-"stump"}
_INTERVAL_SECS=${INTERVAL_SECS:-5}
_DO_PLOT=${DO_PLOT:-false}

if [ "$_DO_PLOT" = false ]; then
    # Clear the stats file if it exists
    > $_STATS_FILE

    capture_stats() {
    docker stats --no-stream --format "{{.CPUPerc}},{{.MemUsage}},{{.MemPerc}},{{.NetIO}}" $_CONTAINER_NAME | \
        awk -F '[ /]' '{print $1 "," $2 "," $4 "," $6 $7}' >> $_STATS_FILE
    }

    while true; do
        capture_stats
        sleep $_INTERVAL_SECS
    done
else
    # FIXME: doesn't work
    set terminal png size 800,600
    set output 'docker_stats.png'
    set title "Docker Stats for $_CONTAINER_NAME"
    set xlabel "Time (seconds)"
    set ylabel "CPU Usage (%)"
    set y2label "Memory Usage (MiB)"
    set grid
    set key outside
    set ytics nomirror
    set y2tics

    # Plot CPU, Memory usage, Memory percentage, and Network I/O
    gnuplot "docker_stats.log" using 0:1 with lines title "CPU (%)" axes x1y1, \
        "docker_stats.log" using 0:2 with lines title "Memory (MiB)" axes x1y2, \
        "docker_stats.log" using 0:3 with lines title "Memory (%)" axes x1y1, \
        "docker_stats.log" using 0:4 with lines title "Net I/O" axes x1y2
fi

