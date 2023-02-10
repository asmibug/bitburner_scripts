/** @param {NS} ns */
import {networkInfoGet} from "lib.js";

export async function main(ns) {
    if (!ns.args.length) {
        throw "Please specify hostname";
    }

    const host = ns.args[0]
    const network_info = networkInfoGet(ns);
    ns.tprintf("%s", network_info.route[host].join("; connect "));
}