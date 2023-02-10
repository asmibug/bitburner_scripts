/** @param {NS} ns */
export async function main(ns) {
    // args: host, time, money, parent_pid
    const money_hacked = await ns.hack(ns.args[0]);
    if (money_hacked != ns.args[2]) {
        ns.kill(ns.args[3]);
        ns.tprintf("ERROR: money_hacked != money_planned: %f != %f",
                   money_hacked, ns.args[2]);
    }
}