/** @param {NS} ns */
import {networkInfoGet} from "lib.js";

export async function main(ns) {
    const grep = ns.args[0];

    function print_ls(host) {
        const files = ns.ls(host, grep);
        if (files.length) {
            ns.tprintf("%-18s:\n    %s", host, files.join("\n    "));
        }
    }

    networkInfoGet(ns).list.map(print_ls);
}