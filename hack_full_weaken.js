/** @param {NS} ns */
export async function main(ns) {
    const host = ns.args[0];
    const s = ns.getServerMinSecurityLevel(host);
    const s0 = ns.getServerSecurityLevel(host);
    if (s == s0) {
        ns.tprintf("INFO host %s is already at minimum security level %f", host, s);
        return;
    }
    const r_w = Math.ceil((s0 - s) / 0.05);
    const weaken_duration = ns.getWeakenTime(host);
    ns.tprintf("INFO running %d weaken threads which should take %s",
            r_w, ns.tFormat(weaken_duration));
    ns.run("hack_weaken.js", r_w, host);
    await ns.sleep(weaken_duration);
    ns.tprintf("INFO DONE weakened %s from %f to %f", host, s0, s);
}