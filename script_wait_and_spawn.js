/** @param {NS} ns */
export async function main(ns) {
    ns.sleep(ns.args[0] - Date.now() - 9000);
    ns.spawn(...ns.args.slice(1));
}