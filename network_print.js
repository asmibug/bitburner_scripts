/** @param {NS} ns */
import {
    nF,
    networkInfoGet, networkInfoGetMaxRam,
    networkInfoGetLevelRequired, networkInfoGetMaxMoney,
    calc_rhs, calc_rgs, calc_rh, calc_rg0,
} from "lib.js";

export async function main(ns) {
    const fh = ns.formulas.hacking;
    const start = performance.now();

    const network_info = networkInfoGet(ns);
    const stats = network_info.stats;

    const player = ns.getPlayer();
    const hacking_level = player.skills.hacking;

    function is_hackable(host) {
        const stat = stats[host];
        return (hacking_level >= networkInfoGetLevelRequired(stat)
                && networkInfoGetMaxMoney(stat));
    }

    function is_fast_hackable(host) {
        const server = ns.getServer(host);
        server.hackDifficulty = server.minDifficulty;
        return (fh.weakenTime(server, player) <= 60000
                && hacking_level >= server.requiredHackingSkill
                && server.moneyMax);
    }

    function print_money_for_manager_v1(host) {
        const server = ns.getServer(host);
        server.hackDifficulty = server.minDifficulty;
        const m = server.moneyMax;
        const h = fh.hackPercent(server, player);
        const g = fh.growPercent(server, 1, player);
        const p = fh.hackChance(server, player);

        const {r_h, r_wh} = calc_rhs(h, g);
        const {r_g, r_wg} = calc_rgs(g, m, m * (1 - h * r_h));
        const r_hall = r_h + r_wh;
        const r_gall = r_g + r_wg;

        const mpt = (
            m * h * r_h * (1 - (1 - p) ** 3)
        ) / (2 * fh.weakenTime(server, player) / 1e3);
        const r_max = Math.max(r_hall, r_gall);

        ns.tprintf("%18s: mpt=%s, mptpt=%s, r_max=%d, r_hall=%d, r_gall=%d, h*r=%.3f",
                   host, nF(ns, mpt), nF(ns, mpt / r_max), r_max, r_hall, r_gall, h * r_h);
    }

    function print_money_for_one_hwgw(host) {
        const server = ns.getServer(host);
        server.hackDifficulty = server.minDifficulty;
        const m = server.moneyMax;
        const h = fh.hackPercent(server, player);
        const g = fh.growPercent(server, 1, player);
        const p = fh.hackChance(server, player);
        const w_t = fh.weakenTime(server, player) / 1e3;
        
        const {r_h, r_wh} = calc_rhs(h, g);
        const {r_g, r_wg} = calc_rgs(g, m, m * (1 - h * r_h));
        const r_hall = r_h + r_wh;
        const r_gall = r_g + r_wg;

        const mpt = (
            m * h * p * r_h
        ) / w_t;
        const r_all = r_hall + r_gall;
        const mptpt_max = m * h * p / (w_t * (1.04 + 1.08 * h / Math.log(g)));

        ns.tprintf("%18s: mpt=%s, mptpt=%s, mptpt_max=%s, r_all=%d, r_hall=%d, r_gall=%d, h*r=%.3f",
                   host, nF(ns, mpt), nF(ns, mpt / r_all), nF(ns, mptpt_max), r_all, r_hall, r_gall, h * r_h);
    }

    function print_money_for_all_hwgw(host) {
        const tmargin = 25 / 1e3;

        const server = ns.getServer(host);
        server.hackDifficulty = server.minDifficulty;
        const m = server.moneyMax;
        const h = fh.hackPercent(server, player);
        const g = fh.growPercent(server, 1, player);
        const p = fh.hackChance(server, player);
        const w_t = Math.floor(fh.weakenTime(server, player)) / 1e3;
        const h_t = Math.floor(fh.hackTime(server, player)) / 1e3;
        
        const {r_h, r_wh} = calc_rhs(h, g);
        const r_g = Math.ceil(-Math.log(1 - h * r_h) / Math.log(g));
        const r_wg = Math.ceil(0.08 * r_g);
        const r_hall = r_h + r_wh;
        const r_gall = r_g + r_wg;        
        const n = 1 + Math.floor((h_t - tmargin) / (4 * tmargin));

        const mt = Math.floor(m * h) * p * r_h * n;
        const mpt = mt / (w_t + 4 * tmargin * n);
        const r_all = (r_hall + r_gall) * n;
        const ram = (1.7 * r_h + 1.75 * (r_wh + r_g + r_wg)) * n;

        ns.tprintf("%18s: mt=%s, mpt=%s, mptpt=%s, ram=%d, r_h=%d, r_g=%d, h*r=%.3f",
                   host, nF(ns, mt), nF(ns, mpt), nF(ns, mpt / r_all), ram, r_h, r_g, h * r_h);
    }

    function print_times(host) {
        const server = ns.getServer(host);
        server.hackDifficulty = server.minDifficulty;

        var h_t = fh.hackTime(server, player) / 1000;
        var g_t = fh.growTime(server, player) / 1000;
        var w_t = fh.weakenTime(server, player) / 1000;

        ns.tprintf("%s: h_t=%f, g_t=%f, w_t=%f, w_t/g_t=%f, w_t/h_t=%f",
                   host, h_t, g_t, w_t, w_t / g_t, w_t / h_t);
    }

    function print_coefs(host) {
        const server = ns.getServer(host);
        server.hackDifficulty = server.minDifficulty;
        const m = server.moneyMax;
        const h = fh.hackPercent(server, player);
        const g = fh.growPercent(server, 1, player);
        const p = fh.hackChance(server, player);
        const r_h = calc_rhs(h, g).r_h;
        const m0 = m * (1 - h * r_h);
        const r_g = calc_rgs(g, m, m0).r_g;

        ns.tprintf("%18s: h=%f; p=%f; g=%f; m=%f; r_h=%f, r_g=%f",
                   host, h, p, g, m, r_h, r_g);
    }

    function print_min_threads(host) {
        const server = ns.getServer(host);
        server.hackDifficulty = server.minDifficulty;
        const h = fh.hackPercent(server, player);
        const g = fh.growPercent(server, 1, player);
        const r_g = Math.ceil(-Math.log(1 - h) / Math.log(g));
        const r_wg = Math.ceil(0.08 * r_g);
        ns.tprintf("%18s: total=%d, r_g=%d, r_wg=%d",
                   host, 2 + r_g + r_wg, r_g, r_wg);
    }

    function print_ram(host) {
        ns.tprintf("%18s: ram = %d", host, networkInfoGetMaxRam(stats[host]));
    }

    function print_level(host) {
        ns.tprintf("%18s: level = %d", host, networkInfoGetLevelRequired(stats[host]));
    }

    let hosts;
    if (ns.args.length) {
        hosts = ns.args;
    } else {
        hosts = network_info.list.filter(is_hackable);
    }
    ns.tprintf("%s\n", hosts.join(" "));
    hosts.forEach(print_money_for_all_hwgw);

    ns.tprintf("INFO DONE; printing took %f s", (performance.now() - start) / 1000);
}