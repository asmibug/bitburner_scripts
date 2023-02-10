/** @param {NS} ns */
import {networkInfoGet} from "lib.js";

export async function main(ns) {
    ns.tprintf("INFO printing routes to servers without backdoor");
    const start = performance.now();
    const network_info = networkInfoGet(ns);
    const level = ns.getHackingLevel();
    function print_no_backdoor(host) {
        const info = ns.getServer(host);
        if (info.requiredHackingSkill <= level && !info.backdoorInstalled
                && !info.purchasedByPlayer) {
            ns.tprintf("%s", network_info.route[host].join("; connect "))
        }
    }
    network_info.list.forEach(print_no_backdoor);
    ns.tprintf("INFO DONE; printing took %f s", (performance.now() - start) / 1000);
}