/** @param {NS} ns */
import {calcHWGWParamsLimited} from "lib.js";

export async function main(ns) {
    const h = ns.args[0];
    const g = ns.args[1];
    const r_max = ns.args[2];
    ns.tprintf("%s", JSON.stringify(calcHWGWParamsLimited(h, g, r_max)));
}