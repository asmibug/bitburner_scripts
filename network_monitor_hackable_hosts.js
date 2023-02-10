/** @param {NS} ns */
import {networkInfoGet, networkInfoGetLevelRequired} from "lib.js";

const FNAME_HACKABLE_HOSTS = "/data/network_hackable_hosts.txt";
const SLEEP_PERIOD_MS = 5 * 60 * 1000;

export async function main(ns) {
    const network_info = networkInfoGet(ns);
    let hosts_list = network_info.list;
    const hosts_stats = network_info.stats;

    if (ns.read(FNAME_HACKABLE_HOSTS).length) {
        const known_hosts = Set(ns.read(FNAME_HACKABLE_HOSTS).split(",").slice(0, -1));
        hosts_list = hosts_list.filter(host => !known_hosts.has(host));
    }

    while (hosts_list.length) {
        for (let i = 0; i < hosts_list.length;) {
            let host = hosts_list[i];
            if (networkInfoGetLevelRequired(hosts_stats[host]) <= ns.getHackingLevel()) {
                hosts_list.splice(i, 1);
                ns.tprintf("WARN host %s is now open", host);
                ns.write(FNAME_HACKABLE_HOSTS, ns.sprintf("%s,", host), "a");
            } else {
                ++i;
            }
        }
        if (hosts_list.length) {
            await ns.sleep(SLEEP_PERIOD_MS);
        }
    }
}