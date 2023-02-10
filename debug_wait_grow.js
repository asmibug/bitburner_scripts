/** @param {NS} ns */
export async function main(ns) {
    let operation_name = "grow";
    const host = ns.args[0];
    const wakeup_time = ns.args[1];
    const wake_delay = ns.args[2] || 10;
    const idx = ns.args[3];
    const total = ns.args[4];
    const expected_duration = ns.args[5];
    const op_delay = ns.args[6] || 20;
    const expected = ns.args[7];
    if (idx !== undefined && total !== undefined) {
        operation_name += ns.sprintf(" %d/%d", idx, total);
    }
    if (wakeup_time - Date.now() > 0) {
        await ns.sleep(wakeup_time - Date.now());
    }
    const start = Date.now();
    if (start - wakeup_time > wake_delay) {
        const t = new Date().toLocaleTimeString();
        const late_for = start - wakeup_time;
        ns.tprintf("ERROR %s %s: %s skipped, late for %d",
                   t, host, operation_name, late_for);
        return;
    }
    const res = await ns.grow(host);
    const finish = Date.now();
    if (expected_duration !== undefined && finish - start - expected_duration > op_delay) {
        const t = new Date().toLocaleTimeString();
        const late_for = finish - start - expected_duration;
        ns.tprintf("ERROR %s %s: %s finish is late for %d",
                   t, host, operation_name, late_for);
    }
    if (expected !== undefined && res != 1 && Math.abs(res - expected) > 1e-6) {
        const t = new Date().toLocaleTimeString();
        ns.tprintf("ERROR %s %s: %s expected != res: %f != %f",
                   t, host, operation_name, expected, res);
    }
}