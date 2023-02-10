/** @param {NS} ns */
export async function main(ns) {
    if (ns.args[1] - Date.now() > 0) {
        await ns.sleep(ns.args[1] - Date.now());
    }
    if (Date.now() - ns.args[1] > 20) {
        return;
    }
    await ns.hack(ns.args[0]);
}