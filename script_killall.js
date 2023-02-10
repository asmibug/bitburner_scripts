/** @param {NS} ns */
import {networkInfoGet} from "lib.script";

export async function main(ns) {
    const network_info = networkInfoGet(ns);
    network_info.list.forEach(host => killall(host, true))
}