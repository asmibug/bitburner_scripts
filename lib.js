/** @param {NS} ns */

export function nF(ns, num) {
    return ns.nFormat(num, "0.000a");
}

export function bisectLeft(a, x) {
    let l = 0;
    let r = a.length;
    while (l < r) {
        const m = Math.floor((l + r) / 2);
        if (a[m] < x) {
            l = m + 1;
        } else {
            r = m;
        }
    }
    return r;
}

export function bisectRight(cost_func, max_n, val) {
    // return min n: cost_func(n) > val
    let l = 0;
    let r = max_n;
    while (l < r) {
        const m = Math.floor((l + r) / 2);
        if (cost_func(m) <= val) {
            l = m + 1;
        } else {
            r = m;
        }
    }
    return r;
}

export function getLowerN(max_n, max_cost, cost_func) {
    // invariant: all cost_func(i) up to l inclusive is <= max_cost
    // invariant: all cost_func(i) to the right of r is > max_cost
    if (cost_func(max_n) <= max_cost) {  // optimization
        return max_n;
    }
    let l = 0;
    let r = max_n;
    while (l < r) {
        let m = Math.ceil((l + r) / 2);
        if (cost_func(m) <= max_cost) {
            l = m;
        } else {
            r = m - 1;
        }
    }
    return l;
}

export function minAndIdx(array) {
    const length = array.length;
    if (!length) {
        throw "minAndIdx: zero length arrays are not allowed";
    }
    let min = array[0];
    let idx = 0;
    for (let i = 1; i < length; ++i) {
        if (array[i] < min) {
            min = array[i];
            idx = i;
        }
    }
    return [min, idx];
}

export function processTree(node, parent, get_children_func, callback_pre, callback_post) {
    if (callback_pre) {
        callback_pre(node);
    }
    const children = get_children_func(node);
    for (let i = 0; i < children.length; ++i) {
        if (children[i] != parent) {
            processTree(children[i], node, get_children_func, callback_pre, callback_post);
        }
    }
    if (callback_post) {
        callback_post(node);
    }
}

export function solve(func, x_0) {
    let x = func(x_0);
    while (Math.abs(x - x_0) > 0.1) {
        x_0 = x;
        x = func(x_0);
    }
    return x;
}

export function calc_rh(h, g) {
    const C = 1.04 / 1.08 * Math.log(g) + 2 * h;
    function get_rh(r) {
        return (1 - Math.exp(-C * r)) / h;
    }
    return Math.floor(solve(get_rh, 0.9 / h));
}

export function calc_rg0(g, m, m0) {
    return Math.ceil(-Math.log(Math.max(m0, 1) / m) / Math.log(g));
}

export function calc_rg(g, m, m0) {
    const C1 = Math.log(m);
    const C2 = 1 / Math.log(g);
    function get_rg(r) {
        return (C1 - Math.log(r + m0)) * C2;
    }
    return Math.ceil(solve(get_rg, calc_rg0(g, m, m0)));
}

export function calc_rhs(h, g, logger) {
    const r_h = calc_rh(h, g);
    const r_wh = Math.ceil(0.04 * r_h);
    if (logger) {
        logger("INFO r_h = %d, h = %f, h * r_h = %f",
               r_h, h, h * r_h);
    }
    return {r_h, r_wh};
}

export function calc_rgs(g, m, m0, logger) {
    const r_g = calc_rg(g, m, m0);
    const r_wg = Math.ceil(0.08 * r_g);
    if (logger) {
        const r_g0 = calc_rg0(g, m, m0);
        logger("INFO r_g = %d, r_g0 = %d, r_g0 / r_g = %f, m0=%f, m=%f",
               r_g, r_g0, r_g0 / r_g, m0, m);
    }
    return {r_g, r_wg};
}

export function calc_rgs0(g, m, m0, logger) {
    const r_g = calc_rg0(g, m, m0);
    const r_wg = Math.ceil(0.08 * r_g);
    if (logger) {
        logger("INFO r_g = %d, m0=%f, m=%f",
               r_g, m0, m);
    }
    return {r_g, r_wg};
}

export function calc_rgs0_limited(r_max) {
    const r_g = Math.floor(r_max / 1.08);
    const r_wg = Math.ceil(0.08 * r_g);
    return {r_g, r_wg};
}

let TMARGIN = 25;

export function getTMargin() {
    return TMARGIN;
}

export function setTMargin(tmargin_new, logger) {
    if (logger) {
        logger("set TMARGIN: tmargin_old=%d, tmargin_new=%d", TMARGIN, tmargin_new);
    }
    TMARGIN = tmargin_new;
}

export function increaseTMargin(tmargin_old, logger) {
    const tmargin_new = tmargin_old + 10;
    setTMargin(tmargin_new, logger);
}

export function getTMin(t) {
    return Math.floor(t);
}

export function getTMax(t) {
    return Math.floor(t) + TMARGIN;
}

export function getHWGWNum(hack_duration, tmargin) {
    return 1 + Math.floor((hack_duration - tmargin) / (4 * tmargin));
}

export function calcHWGWParams(h, g) {
    const {r_h, r_wh} = calc_rhs(h, g);
    const r_g = Math.ceil(-Math.log(1 - h * r_h) / Math.log(g));
    const r_wg = Math.ceil(0.08 * r_g);
    return {r_h, r_wh, r_g, r_wg};
}

export function calcHWGWParamsLimited(h, g, r_max) {
    function get_rh(r) {
        const r1 = (1 - g ** ((1.04 * r - r_max) / 1.08)) / h;
        const r2 = (1.08 * Math.log(1 - h * r) / Math.log(g) + r_max) / 1.04;  // may be NaN
        if (Math.abs(r2 - r) < Math.abs(r1 - r)) {
            return r2;
        }
        return r1;
    }
    const r = Math.floor(solve(get_rh, 0));
    const r_wh = Math.ceil(0.04 * r);
    const r_g = Math.ceil(-Math.log(1 - h * r) / Math.log(g));
    const r_wg = Math.ceil(0.08 * r_g);
    const r_h = Math.min(r, r_max - r_wh - r_g - r_wg);
    return {r_h, r_wh, r_g, r_wg};
}

export const SCRIPTS = {
    h: "hack_wait_hack.js",
    g: "hack_wait_grow.js",
    w: "hack_wait_weaken.js",
};

export const RAM = {
    h: 1.7,
    g: 1.75,
    w: 1.75,
};

export function getWT(ns, host) {
    return Math.floor(ns.getWeakenTime(host));
}

export function getDurations(ns, host) {  // ns, host
    // weaken must be first, because later we check whether it is changed
    // and if it is changed, we assume that everything else is changed
    const w = getWT(ns, host);
    const g = Math.floor(ns.getGrowTime(host));
    const h = Math.floor(ns.getHackTime(host));
    return {w, g, h};
}

export function getAge(ns) {
    return ns.getTimeSinceLastAug();
}

export function networkInfoGetFilename() {
    return "/data/network_info.txt";
}

export function networkInfoGetScriptname() {
    return "network_save.js";
}

async function networkInfoCreateWithFunc(ns, func) {
    const script_name = networkInfoGetScriptname();
    const pid = func(script_name);
    if (!pid) {
        throw ns.sprintf("Could not run %s, please run manually", script_name);
    }
    await pidWait(ns, pid);
}

export async function networkInfoCreateWithRun(ns) {
    await networkInfoCreateWithFunc(ns, ns.run);
}

export async function networkInfoCreateWithExec(ns, host) {
    await networkInfoCreateWithFunc(ns, script_name => ns.exec(script_name, host));
}

export function networkInfoGet(ns) {
    const network_info_str = ns.read(networkInfoGetFilename());
    if (!network_info_str.length) {
        throw ns.sprintf("No network info in %s", networkInfoGetFilename());
    }
    return JSON.parse(network_info_str);
}

export function networkInfoGetStats(ns, host) {
    return [
        ns.getServerNumPortsRequired(host),
        ns.getServerMaxRam(host),
        ns.getServerRequiredHackingLevel(host),
        ns.getServerMinSecurityLevel(host),
        ns.getServerMaxMoney(host),
    ];
}

export function networkInfoGetPortsRequired(stats) {
    return stats[0];
}

export function networkInfoGetMaxRam(stats) {
    return stats[1];
}

export function networkInfoGetLevelRequired(stats) {
    return stats[2];
}

export function networkInfoGetMinSecurity(stats) {
    return stats[3];
}

export function networkInfoGetMaxMoney(stats) {
    return stats[4];
}

export function updateRamList(ns, network_info, ram_list) {
    const stats = network_info.stats;
    ram_list.forEach(host_ram => host_ram[1] = (
        networkInfoGetMaxRam(stats[host_ram[0]]) - ns.getServerUsedRam(host_ram[0])));
}

export function getRamList(ns, network_info) {
    const stats = network_info.stats;
    const ram_list = network_info.list.filter(
        host => networkInfoGetMaxRam(stats[host]) > 0 && ns.hasRootAccess(host)
    ).map(
        host => [host, 0]
    );
    updateRamList(ns, network_info, ram_list);
    ram_list.sort((a, b) => b[1] - a[1]);
    return ram_list;
}

export function getThreadsAvailable(ns, network_info, ram_list, script_ram) {
    let threads_available = 0;
    updateRamList(ns, network_info, ram_list);
    ram_list.forEach(host_ram => threads_available += Math.floor(host_ram[1] / script_ram));
    return threads_available;
}

export function execShared(ns, ram_list, script_ram, fname, threads, ...args) {
    const processes = [];
    for (const host_ram of ram_list) {
        if (threads <= 0) {
            break;
        }
        const r = Math.min(Math.floor(host_ram[1] / script_ram), threads);
        if (r <= 0) {
            continue;
        }
        const host = host_ram[0];
        const pid = ns.exec(fname, host, r, ...args);
        if (pid === 0) {
            continue;
        }
        processes.push({pid, host, threads: r});
        host_ram[1] -= r * script_ram;
        threads -= r;
    }
    return {threads_left: threads, processes};
}

export function execSharedRetry(
        ns, network_info, ram_list, script_ram, fname, threads, ...args) {
    const processes = [];
    let new_processes;
    ({threads_left: threads, processes: new_processes} = execShared(
        ns, ram_list, script_ram, fname, threads, ...args));
    processes.push(...new_processes);
    while (threads > 0) {
        updateRamList(ns, network_info, ram_list);
        const threads_old = threads;
        ({threads_left: threads, processes: new_processes} = execShared(
            ns, ram_list, script_ram, fname, threads, ...args));
        processes.push(...new_processes);
        if (threads == threads_old) {
            break;
        }
    }
    return {threads_left: threads, processes};
}

export async function execSharedRetryWait(
        ns, network_info, ram_list, script_ram, fname, threads, ...args) {
    const processes = [];
    let new_processes;
    ({threads_left: threads, processes: new_processes} = execSharedRetry(
        ns, network_info, ram_list, script_ram, fname, threads, ...args));
    processes.push(...new_processes);
    while (threads > 0) {
        await ns.sleep(1000);
        ({threads_left: threads, processes: new_processes} = execSharedRetry(
            ns, network_info, ram_list, script_ram, fname, threads, ...args));
        processes.push(...new_processes);
    }
    return processes;
}

export function execSharedTryRunPack(ns, network_info, ram_list, processes_to_run) {
    const runned_processes = [];
    for (const [script, script_ram, threads, ...args] of processes_to_run) {
        const {threads_left, processes} = execSharedRetry(
            ns, network_info, ram_list, script_ram, script, threads, ...args);
        runned_processes.push(processes);
        if (threads_left > 0) {
            runned_processes.forEach(processes => processes.forEach(p => ns.kill(p.pid)));
            return [];
        }
    }
    return runned_processes;
}

export async function pidWait(ns, pid) {
    while (ns.isRunning(pid)) {
        await ns.sleep(20);
    }
}

export async function pidWaitAll(ns, pids) {
    for (const pid of pids) {
        await pidWait(ns, pid);
    }
}

export function scpMultiple(ns, files, destinations, source=undefined) {
    destinations.forEach(d => ns.scp(files, d, source));
}

export async function makeSureSecurityIsMinimal(ns, network_info, host) {
    const s0 = ns.getServerSecurityLevel(host);
    const s = networkInfoGetMinSecurity(network_info.stats[host]);
    if (s0 - s < 0.001) {
        return;
    }
    ns.tprintf("ERROR %s %s: security is not minimal: %f=s != s0=%f",
                new Date().toLocaleTimeString(), host, s, s0);
    const ram_list = getRamList(ns, network_info);
    const r_w = Math.ceil((s0 - s) / 0.05);
    const processes = await execSharedRetryWait(
        ns, network_info, ram_list, RAM.w, SCRIPTS.w, r_w, host, Date.now());
    await ns.sleep(getWT(ns, host));
    await pidWaitAll(ns, processes.map(p => p.pid));
}

export function nukeAll(ns, network_info) {
    const programs_info = [
        ["BruteSSH.exe", ns.brutessh],
        ["FTPCrack.exe", ns.ftpcrack],
        ["relaySMTP.exe", ns.relaysmtp],
        ["HTTPWorm.exe", ns.httpworm],
        ["SQLInject.exe", ns.sqlinject],
    ];
    const programs_available = programs_info.filter(
        kv => ns.fileExists(kv[0], "home")
    ).map(
        kv => kv[1]
    );

    const hosts_list = network_info.list;
    const hosts_stats = network_info.stats;

    const hosts_nuked = hosts_list.filter(
        host => (programs_available.length >= networkInfoGetPortsRequired(hosts_stats[host]) 
                 && !ns.hasRootAccess(host))
    ).map(
        host => {
            programs_available.forEach(program => program(host));
            ns.nuke(host);
            return host;
        }
    )
    return {programs_available_num: programs_available.length,
            hosts_nuked_num: hosts_nuked.length};
}