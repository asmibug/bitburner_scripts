/** @param {NS} ns */
import {
    networkInfoGet, networkInfoGetMaxRam,
} from "lib.js";

function getAvailableThreads(network_info, used_ram_func, thread_ram) {
    const stats = network_info.stats;
    return network_info.list.map(
        h => [
            h,
            Math.floor((networkInfoGetMaxRam(stats[h]) - used_ram_func(h)) / thread_ram)
        ]
    ).filter(
        h_ram => h_ram[1] > 0
    );
}

export async function main(ns) {
    const network_info = networkInfoGet(ns);
    network_info.list = network_info.list.filter(
        h => ns.hasRootAccess(h) && networkInfoGetMaxRam(network_info.stats[h]) > 0);

    const available_threads = getAvailableThreads(network_info, ns.getServerUsedRam, 1.75);
    available_threads.sort((a, b) => b[1] - a[1]);
    ns.tprintf("%s", JSON.stringify(available_threads));
}