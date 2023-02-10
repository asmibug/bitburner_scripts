/** @param {NS} ns */
export async function main(ns) {
    if (ns.args[1] - Date.now() > 0) {
        await ns.sleep(ns.args[1] - Date.now());
    }
    await ns.weaken(ns.args[0]);
}