/** @param {NS} ns */
import {
    processTree,
    networkInfoGetFilename, networkInfoGetStats,
    getAge,
} from "lib.js";

function saveHost(ns, host, network_info, route) {
    route.push(host);
    network_info.list.push(host);
    network_info.route[host] = route.slice();
    network_info.stats[host] = networkInfoGetStats(ns, host);
}

function popHost(route) {
    route.pop();
}

export async function main(ns) {
    let network_info = {
        list: [],
        route: {},
        stats: {},
        age: getAge(ns),
    };
    let route = [];
    function callback_pre(host) {
        saveHost(ns, host, network_info, route);
    }
    function callback_post(host) {
        popHost(route);
    }

    ns.tprintf("INFO processing network");
    const start = performance.now();
    processTree("home", undefined, ns.scan, callback_pre, callback_post);
    ns.tprintf("INFO DONE; processing network took %f s", (performance.now() - start) / 1000);

    ns.write(networkInfoGetFilename(), JSON.stringify(network_info), "w");
    ns.tprintf("INFO network info was saved to %s", networkInfoGetFilename());
}