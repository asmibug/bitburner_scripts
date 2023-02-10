/** @param {NS} ns */
import {getTMin, getTMax, setTMargin, pidWait, calc_rhs, calc_rgs} from "lib.js";

export async function main(ns) {
    const host = ns.args[0];
    await ns.sleep(getTMax(ns.getWeakenTime(host)));  // for the case of restart

    const g = ns.args[1];
    const m = ns.args[2];
    const host_for_scripts = ns.args[3];

    const printf = ns.printf.bind(ns);

    function weaken_exec(r, name) {
        const tmargin_old = getTMax(0);
        let weaken_time_max = getTMax(ns.getWeakenTime(host));
        const weaken_pid = ns.exec("hack_weaken.js", host_for_scripts, r, host);
        let weaken_start = Date.now();
        ns.printf("INFO TMARGIN = %s", tmargin_old);
        if (!weaken_pid) {
            throw ns.sprintf("%s: can't exec weaken for %s", host, name);
        }
        return {weaken_pid, weaken_start, weaken_time_max, tmargin_old};
    }

    async function weaken_wait(pid, dt, tmargin_old) {
        await ns.sleep(dt - Date.now());
        if (ns.isRunning(pid) && getTMax(0) == tmargin_old) {
            const tmargin_new = tmargin_old + 10;
            setTMargin(tmargin_new);
            ns.tprint(ns.sprintf(
                "INFO set TMARGIN: tmargin_old=%d, tmargin_new=%d, current=%d",
                tmargin_old, tmargin_new, getTMax(0)));
        }
        await pidWait(ns, pid);
    }

    let weaken_pid, weaken_start, weaken_time_max, tmargin_old;
    let r_g, r_wg;
    let m0 = ns.getServerMoneyAvailable(host);
    if (m0 != m) {
        ({r_g, r_wg} = calc_rgs(g, m, m0, printf));
        ({weaken_pid, weaken_start, weaken_time_max, tmargin_old} = weaken_exec(r_wg, "grow"));
        ns.exec("hack_grow.js", host_for_scripts, r_g, host);
        await weaken_wait(weaken_pid, weaken_start + weaken_time_max, tmargin_old);
    }

    let {r_h, r_wh} = calc_rhs(ns.hackAnalyze(host), g, printf);
    while (true) {
        ({weaken_pid, weaken_start, weaken_time_max, tmargin_old} = weaken_exec(r_wh, "hack"));
        let weaken_time_min = getTMin(ns.getWeakenTime(host));
        let hack_time_max = getTMax(ns.getHackTime(host));
        do {
            ns.exec("hack_hack.js", host_for_scripts, r_h, host);
            await ns.sleep(hack_time_max);
            m0 = ns.getServerMoneyAvailable(host);
            hack_time_max = getTMax(ns.getHackTime(host));
        } while (m0 == m && Date.now() + hack_time_max < weaken_start + weaken_time_min);
        ({r_g, r_wg} = calc_rgs(g, m, m0, printf));
        await weaken_wait(weaken_pid, weaken_start + weaken_time_max, tmargin_old);

        // DEBUG CHECKS
        let s0 = ns.getServerSecurityLevel(host);
        const s = ns.getServerMinSecurityLevel(host);
        if (s0 - s > 0.001) {
            throw ns.sprintf("%s after hack: %f=s != s0=%f", host, s, s0);
        }

        if (m0 == m) {
            continue;
        }
        ({weaken_pid, weaken_start, weaken_time_max, tmargin_old} = weaken_exec(r_wg, "grow"));
        ns.exec("hack_grow.js", host_for_scripts, r_g, host);
        ({r_h, r_wh} = calc_rhs(ns.hackAnalyze(host), g, printf));
        await weaken_wait(weaken_pid, weaken_start + weaken_time_max, tmargin_old);

        // DEBUG CHECKS
        s0 = ns.getServerSecurityLevel(host);
        m0 = ns.getServerMoneyAvailable(host);
        if (m0 != m) {
            throw ns.sprintf("%s after grow: %s=m != m0=%s",
                             host, ns.nFormat(m, "0.000a"), ns.nFormat(m0, "0.000a"));
        }
        if (s0 - s > 0.001) {
            throw ns.sprintf("%s after grow: %f=s != s0=%f", host, s, s0);
        }
    }
}