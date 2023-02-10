/** @param {NS} ns */
import {
    nF, scpMultiple,  // required for commented code
    SCRIPTS, RAM,
    networkInfoGet, networkInfoGetMaxMoney,
    makeSureSecurityIsMinimal,
    getWT, getDurations,
    calc_rgs0, calc_rgs0_limited,
    calcHWGWParams, calcHWGWParamsLimited,
    getRamList, getThreadsAvailable,
    execSharedTryRunPack,
    pidWaitAll,
} from "lib.js";

const TMARGIN = 25;

export async function main(ns) {
    const host = ns.args[0];

    // Uncomment line below if this script runs standalone
    // scpMultiple(ns, Object.values(SCRIPTS), networkInfoGet(ns).list, "home");

    function tryRun(min_finish, processes_to_run, network_info, ram_list, runned_pids) {
        const runned_processes = execSharedTryRunPack(
            ns, network_info, ram_list, processes_to_run);
        if (runned_processes.length <= 0) {
            return min_finish;
        }
        runned_processes.forEach(processes => runned_pids.push(processes.map(p => p.pid)));
        return min_finish + processes_to_run.length * TMARGIN;
    }

    function tryRunHWGW(min_finish, durations, params, network_info, ram_list, runned_pids) {
        const {r_h, r_wh, r_g, r_wg} = params;
        const processes_to_run = [
            [SCRIPTS.h, RAM.h, r_h, host, min_finish - durations.h],
            [SCRIPTS.w, RAM.w, r_wh, host, min_finish + TMARGIN - durations.w],
            [SCRIPTS.g, RAM.g, r_g, host, min_finish + 2 * TMARGIN - durations.g],
            [SCRIPTS.w, RAM.w, r_wg, host, min_finish + 3 * TMARGIN - durations.w],
        ];
        return tryRun(min_finish, processes_to_run, network_info, ram_list, runned_pids);
    }

    function tryRunGW(min_finish, durations, params, network_info, ram_list, runned_pids) {
        const {r_g, r_wg} = params;
        const processes_to_run = [
            [SCRIPTS.g, RAM.g, r_g, host, min_finish - durations.g],
            [SCRIPTS.w, RAM.w, r_wg, host, min_finish + TMARGIN - durations.w],
        ];
        return tryRun(min_finish, processes_to_run, network_info, ram_list, runned_pids);
    }

    while (true) {
        const network_info = networkInfoGet(ns);
        await makeSureSecurityIsMinimal(ns, network_info, host);

        // DEBUG: START
        // const start = Date.now();
        // const money_before = ns.getRunningScript().onlineMoneyMade;
        // DEBUG: END

        const durations = getDurations(ns, host);
        const g = Math.pow(2, 1 / ns.growthAnalyze(host, 2));
        const m = networkInfoGetMaxMoney(network_info.stats[host]);
        const m0 = ns.getServerMoneyAvailable(host);
        const params0 = calc_rgs0(g, m, m0);
        const h = ns.hackAnalyze(host);
        const params = calcHWGWParams(h, g);

        const ram_list = getRamList(ns, network_info);

        if (durations.w != getWT(ns, host)) {
            continue;
        }

        const runned_pids = [];
        let current_min_finish = Date.now() + durations.w;
        const max_min_finish = current_min_finish + durations.h - TMARGIN;
        if (m0 < m) {
            const new_current_min_finish = tryRunGW(
                current_min_finish, durations, params0, network_info, ram_list, runned_pids);
            if (new_current_min_finish == current_min_finish) {
                const threads_available = getThreadsAvailable(
                    ns, network_info, ram_list, RAM.w);
                const params_limited = calc_rgs0_limited(threads_available);
                if (params_limited.r_g > 0) {
                    current_min_finish = tryRunGW(
                        current_min_finish, durations, params_limited,
                        network_info, ram_list, runned_pids);
                }   
            } else {
                current_min_finish = new_current_min_finish;
            }
        } else {
            current_min_finish = tryRunHWGW(
                current_min_finish, durations, params, network_info, ram_list, runned_pids);
        }
        while (current_min_finish <= max_min_finish) {
            const new_current_min_finish = tryRunHWGW(
                current_min_finish, durations, params, network_info, ram_list, runned_pids);
            if (new_current_min_finish == current_min_finish) {
                break;
            }
            current_min_finish = new_current_min_finish;
        }
        if (current_min_finish <= max_min_finish) {
            const threads_available = getThreadsAvailable(
                ns, network_info, ram_list, RAM.w);
            const params_limited = calcHWGWParamsLimited(h, g, threads_available);
            if (params_limited.r_h > 0) {
                current_min_finish = tryRunHWGW(
                    current_min_finish, durations, params_limited,
                    network_info, ram_list, runned_pids);
            }
        }

        await ns.sleep(current_min_finish - durations.w - Date.now());
        if (durations.w != getWT(ns, host)) {
            runned_pids.forEach(pids => pids.forEach(ns.kill));
            continue;
        }

        await ns.sleep(current_min_finish - Date.now());
        await pidWaitAll(ns, runned_pids.at(-1) || []);  // last process must finish last
        runned_pids.forEach(pids => pids.forEach(ns.kill));  // in case there are out of order processes

        // DEBUG: START
        // const money_made = ns.getRunningScript().onlineMoneyMade - money_before;
        // ns.tprintf("INFO %s %s: made %s (%s / s)",
        //            new Date().toLocaleTimeString(), host,
        //            nF(ns, money_made), nF(ns, money_made * 1e3 / (Date.now() - start)));
        // DEBUG: END
    }
}