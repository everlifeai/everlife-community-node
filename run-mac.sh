#!/bin/bash

#   understand/
# Entry point
function main() {
    setup
    run "$@"
}

#   outcome/
# If `node_modules` is missing we set it up
function setup() {
    if [ ! -d node_modules ]
    then
        setup_node_modules
        fixAppKey
    fi
}

function setup_node_modules() {
    printf "Setting up node_modules...\n"
    npm install
    printf "\n\n"
}

function fixAppKey() {
    printf "Fixing AppKey...\n"
    node fixAppKey.js
    printf "\n\n"
}

function run() {
    node run.js "$@"
}

main "$@"
