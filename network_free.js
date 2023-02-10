/** @param {NS} ns */
import {networkInfoGet, networkInfoGetMaxRam} from "lib.js";

const RAM_DISPLAY_SYMBOLS = 32;

export async function main(ns) {
    const network_info = networkInfoGet(ns);
    const stats = network_info.stats;
    let total_used = 0;
    let total_free = 0;
    const servers = network_info.list.filter(ns.hasRootAccess);
    servers.forEach(s => {
        const ram_used = ns.getServerUsedRam(s);
        total_used += ram_used;
        const ram_max = networkInfoGetMaxRam(stats[s]);
        const ram_free = ram_max - ram_used;
        if (ram_free > 1.6 - 1e-6) {
            total_free += ram_free;
        }
        if (ram_used > 0) {
            const used_symbols = Math.round(RAM_DISPLAY_SYMBOLS * Math.min(
                (ram_max > 0 ? ram_used / ram_max : 1), 1));
            const used_str = "|".repeat(used_symbols);
            const free_str = "-".repeat(RAM_DISPLAY_SYMBOLS - used_symbols);
            ns.tprintf("%18s %s%s %10.2f/%.2f", s, used_str, free_str, ram_used, ram_max);
        }
    });
    ns.tprintf("Total used: %.2f; total free: %.2f", total_used, total_free);
}