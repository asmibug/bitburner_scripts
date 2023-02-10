/** @param {NS} ns */
import {
    getTMargin, setTMargin, increaseTMargin,
    bisectRight,
    pidWait,
    solve,
} from "lib.js";

const Op = {
    hack: "hack",
    grow: "grow",
    weaken: "weaken",
}

export async function main(ns) {
    const host = ns.args[0];
    await ns.sleep(ns.getWeakenTime(host) + getTMargin());  // for the case of restart
    ns.disableLog("ALL");

    // TODO: should refactor all below
    setTMargin(100);
    const host_for_scripts = ns.args[1] || "myserver-0";
    const s = ns.getServerMinSecurityLevel(host);
    const m = ns.getServerMaxMoney(host);
    
    function checkSecurityIsMinimal(operation) {
        const s0 = ns.getServerSecurityLevel(host);
        if (s0 - s > 0.001) {
            let info = "";
            if (operation) {
                info = ns.sprintf("\nDate.now() - operation.start = %d\noperation = %s",
                                  Date.now() - operation.start, JSON.stringify(operation));
            }
            throw ns.sprintf("%s: %f=s != s0=%f", host, s, s0) + info;
        }
    }

    function calculateOptimalHackMoney(g) {
        const h = ns.hackAnalyze(host);
        function get_rh(r) {
            return (1 - Math.exp(-(1.04 / 1.08 * Math.log(g) + 2 * h) * r)) / h;
        }
        const r_h = Math.floor(solve(get_rh, 0.9 / h));
        return m * h * r_h;
    }

    function getOperationDuration(op) {
        let duration;
        switch (op) {
            case Op.hack:
                duration = ns.getHackTime(host);
                break;
            case Op.grow:
                duration = ns.getGrowTime(host);
                break;
            case Op.weaken:
                duration = ns.getWeakenTime(host);
                break;
            default:
                throw ns.sprintf("unknown op: %s", op);
        }
        return Math.floor(duration);
    }

    function getMinFinishTime(timeline) {
        const finishes = timeline.finishes;
        if (finishes.length === 0) {
            return Date.now() + getOperationDuration(Op.weaken);
        }
        return finishes[finishes.length - 1].finish;
    }

    function findStart(timeline, min_time, tmargin) {
        const finishes = timeline.finishes;
        const length = finishes.length;
        function get_finish(i) {
            return finishes[i].finish;
        }
        let idx = bisectRight(get_finish, length, min_time);
        if (idx > 0) {
            min_time = Math.max(get_finish(idx - 1) + tmargin, min_time);
        }
        while (idx < length && min_time > get_finish(idx) - tmargin) {
            min_time = get_finish(idx) + tmargin;
            ++idx;
        }
        const start_obj = {
            start: min_time,
            run_after: undefined,
        }
        if (idx > 0) {
            start_obj.run_after = finishes[idx - 1].pid;
        }
        return start_obj;
    }

    function getOperationAndWeaken(timeline, op) {
        const min_finish_time = getMinFinishTime(timeline);
        const operation_duration = getOperationDuration(op);
        const weaken_duration = getOperationDuration(Op.weaken);
        const tmargin = getTMargin();

        let operation_finish_time = min_finish_time + tmargin;
        let operation_start_obj, weaken_start_obj;
        let found_operation_start = false;
        while (!found_operation_start) {
            operation_start_obj = findStart(
                timeline, operation_finish_time - operation_duration, tmargin);
            found_operation_start = true;
            const min_weaken_finish_time = operation_start_obj.start + operation_duration + tmargin;
            const min_weaken_start_time = min_weaken_finish_time - weaken_duration;
            weaken_start_obj = findStart(timeline, min_weaken_start_time, tmargin);
            if (weaken_start_obj.start != min_weaken_start_time) {
                found_operation_start = false;
                operation_finish_time = weaken_start_obj.start + weaken_duration - tmargin;
            }
        }
        const operation_finish = {
            finish: operation_start_obj.start + operation_duration,
            pid: undefined,
        }
        const operation = {
            start: operation_start_obj.start,
            duration: operation_duration,
            op: op,
            threads: undefined,
            finish_obj: operation_finish,
            run_after: operation_start_obj.run_after,
            tmargin: tmargin,
        }
        const weaken_finish = {
            finish: weaken_start_obj.start + weaken_duration,
            pid: undefined,
        }
        const weaken_operation = {
            start: weaken_start_obj.start,
            duration: weaken_duration,
            op: Op.weaken,
            threads: undefined,
            finish_obj: weaken_finish,
            run_after: weaken_start_obj.run_after,
            tmargin: tmargin,
        }
        return [operation, weaken_operation]
    }

    function setOperationParameters(operation, money_to_hack) {
        switch (operation.op) {
            case Op.hack:
                operation.threads = Math.floor(money_to_hack / m / ns.hackAnalyze(host));
                break;
            case Op.grow: {
                operation.threads = Math.ceil(-Math.log(((m - money_to_hack) || 1) / m)
                                              / Math.log(g));
                break;
            }
            default:
                throw ns.sprintf("setOperationParameters: wrong operation.op: %s", operation.op);
        }
    }

    function setWeakenParameters(weaken_operation, operation) {
        let threads_coef;
        switch (operation.op) {
            case Op.hack:
                threads_coef = 0.04;
                break;
            case Op.grow:
                threads_coef = 0.08;
                break;
            default:
                throw ns.sprintf("setWeakenParameters: wrong operation.op: %s", operation.op);
        }
        weaken_operation.threads = Math.ceil(operation.threads * threads_coef);
    }

    function addOperationToTimeline(timeline, operation) {
        const starts = timeline.starts;
        const starts_idx = bisectRight(i => starts[i].start, starts.length, operation.start);
        starts.splice(starts_idx, 0, operation);
        const finish_obj = operation.finish_obj;
        const finishes = timeline.finishes;
        const finishes_idx = bisectRight(
            i => finishes[i].finish, finishes.length, finish_obj.finish);
        finishes.splice(finishes_idx, 0, finish_obj);
    }

    function getFileName(operation) {
        switch (operation.op) {
            case Op.hack:
                return "test_hack.js";
            case Op.grow:
                return "hack_grow.js";
            case Op.weaken:
                return "hack_weaken.js";
            default:
                throw ns.sprintf("unknown operation.op: %s", operation.op);
        }
    }

    function runOperation(operation) {
        checkSecurityIsMinimal(operation);
        const fname = getFileName(operation);
        let pid;
        if (operation.op == Op.hack) {
            pid = ns.exec(fname, host_for_scripts, operation.threads, host, operation.start,
                          Math.floor(m * ns.hackAnalyze(host)) * operation.threads, ns.pid);
        } else {
            pid = ns.exec(fname, host_for_scripts, operation.threads, host, operation.start);
        }
        const start_time = Date.now();
        if (!pid) {
            throw ns.sprintf("%s: failed to run operation\n%s", host, JSON.stringify(operation));
        }
        operation.finish_obj.finish = start_time + operation.duration;
        operation.finish_obj.pid = pid;
        return pid;
    }

    function stopOperation(timeline, operation) {
        const finishes = timeline.finishes;
        const finish_idx = finishes.indexOf(operation.finish_obj);
        ns.kill(finishes[finish_idx].pid);
        finishes.splice(finish_idx, 1);
    }

    function handleDurationChange(timeline) {
        // There are 3 strategies:
        // 1. Simplest: just clear timeline.starts
        // 2. Clear timeline.starts and remove corresponding objects from finishes
        // 3. Remove from timeline.starts only objects with changed duration
        //    and corresponding objects from finishes
        // Here implemented strategy 1
        timeline.starts.splice(0);
    }

    function cleanupFinishes(finishes) {
        const old_num = bisectRight(i => finishes[i].finish, finishes.length, Date.now());
        finishes.splice(0, old_num);
    }

    function printToTerminal(...s) {
        ns.tprint(ns.sprintf("INFO %s: ", host) + ns.sprintf(...s));
    }

    async function waitAndRunOperationsUpToWeaken(timeline) {
        const starts = timeline.starts;
        let is_weaken_run = false;
        while (starts.length && !is_weaken_run) {
            const operation = starts[0];
            if (operation.start > Date.now()) {
                await ns.sleep(operation.start - Date.now());
            }
            if (Date.now() - operation.start >= getTMargin() / 2) {
                setTMargin(2 * (Date.now() - operation.start), printToTerminal);
                starts.splice(0);
                break;
            }
            while (starts.length && starts[0].start <= Date.now()) {
                const operation = starts[0];
                if (operation.run_after && ns.isRunning(operation.run_after)) {
                    if (operation.tmargin == getTMargin()) {
                        increaseTMargin(operation.tmargin, printToTerminal);
                    }
                    starts.splice(0);
                    break;
                }

                runOperation(operation);
                starts.shift();
                if (operation.op == Op.weaken) {
                    is_weaken_run = true;
                }

                if (getOperationDuration(operation.op) != operation.duration) {
                    checkSecurityIsMinimal(operation);
                    stopOperation(timeline, operation);
                    handleDurationChange(timeline);
                }
            }
        }
        cleanupFinishes(timeline.finishes);
    }

    async function addOperationAndWeakenToTimelineAndRun(timeline, op, money_to_hack) {
        const [operation, weaken_operation] = getOperationAndWeaken(timeline, op);
        setOperationParameters(operation, money_to_hack);
        addOperationToTimeline(timeline, operation);
        setWeakenParameters(weaken_operation, operation);
        addOperationToTimeline(timeline, weaken_operation);
        await waitAndRunOperationsUpToWeaken(timeline);
    }
    // TODO: END

    checkSecurityIsMinimal();
    const g = Math.pow(2, 1 / ns.growthAnalyze(host, 2));

    const timeline = {
        starts: [],
        finishes: [],
    }

    let m0 = ns.getServerMoneyAvailable(host);
    if (m0 != m) {
        await addOperationAndWeakenToTimelineAndRun(timeline, Op.grow, m - m0);
    }
    while (true) {
        const mh = calculateOptimalHackMoney(g);
        await addOperationAndWeakenToTimelineAndRun(timeline, Op.hack, mh);
        await addOperationAndWeakenToTimelineAndRun(timeline, Op.grow, mh);
    }
}