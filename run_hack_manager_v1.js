/** @param {NS} ns */
import {nF} from "lib.js";

const HOST_FOR_SCRIPTS = "myserver-0";

export async function main(ns) {
    const fh = ns.formulas.hacking;

    ns.scp(["hack_hack.js", "hack_grow.js", "hack_weaken.js"], HOST_FOR_SCRIPTS);

    const player = ns.getPlayer();
    function exec_manager(host) {
        const server = ns.getServer(host);
        const m = server.moneyMax;
        const m0 = server.moneyAvailable;
        const s = server.minDifficulty;
        const s0 = server.hackDifficulty;
        ns.printf("INFO %s: m=%s, m0=%s, s=%f, s0=%f",
               host, nF(ns, m), nF(ns, m0), s, s0);

        if (s0 - s > 0.001) {
            ns.exec("hack_weaken.js", HOST_FOR_SCRIPTS, Math.ceil((s0 - s) / 0.05), host);
        }

        server.hackDifficulty = s;
        const g = fh.growPercent(server, 1, player);
        ns.exec("hack_manager_v1.js", ns.getHostname(), 1,
                host, g, m, HOST_FOR_SCRIPTS);
    }

    ns.args.forEach(exec_manager);
}