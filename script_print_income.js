/** @param {NS} ns */
import {nF, networkInfoGet} from "lib.js";

export async function main(ns) {
    if (ns.args[0]) {
        const pid = ns.args[0];
        const script = ns.getRunningScript(pid);
        ns.tprintf("%d script income: %s / sec",
                   pid, nF(ns, script.onlineMoneyMade / script.onlineRunningTime));
    } else {
        const hosts_list = networkInfoGet(ns).list;
        for (const host of hosts_list) {
            const processes = ns.ps(host);
            for (const process of processes) {
                const script = ns.getRunningScript(process.pid);
                if (script.onlineMoneyMade) {
                    const income = script.onlineMoneyMade / script.onlineRunningTime;
                    const threads_str = (process.threads != 1
                                         ? ns.sprintf("-t %d ", process.threads)
                                         : "");
                    const cmd = ns.sprintf(
                        "%s: %s %s%s",
                        host, process.filename, threads_str,
                        process.args.map(JSON.stringify).join(" "));
                    ns.tprintf("%d's income: %s / sec (%s)",
                               process.pid, nF(ns, income), cmd);
                }
            }
        }
        const [total, since_aug] = ns.getTotalScriptIncome();
        ns.tprintf("Total script income: %s / sec | %s / sec",
                   nF(ns, total), nF(ns, since_aug));
    }
}