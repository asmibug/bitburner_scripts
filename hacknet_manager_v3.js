/** @param {NS} ns */
import {getLowerN, nF} from "lib.js";

const SLEEP_PERIOD_MS = 5 * 60 * 1000;
const FILENAME_WITH_FULL_UPGRADE_COST = "/data/hacknet_upgrade_cost.txt";

async function waitBuyNode(ns) {
    ns.printf("INFO Buying new node");
    let new_node_idx = ns.hacknet.purchaseNode();
    while (new_node_idx == -1) {
        await ns.sleep(SLEEP_PERIOD_MS);
        new_node_idx = ns.hacknet.purchaseNode();
    }
    ns.printf("INFO DONE Bying new node number %d", new_node_idx);
    return new_node_idx;
}

async function waitUpgradeNode(ns, node_idx, num_upgrades, cost_func, upgrade_func) {
    // num_upgrades must be not greater than maximum upgrades number

    function upgrade_cost_func(num_upgrades) {
        return cost_func(node_idx, num_upgrades);
    }

    while (num_upgrades > 0 && !upgrade_func(node_idx, num_upgrades)) {
        let money = ns.getServerMoneyAvailable("home");
        let affordable_upgrades = getLowerN(num_upgrades, money, upgrade_cost_func);
        if (affordable_upgrades && upgrade_func(node_idx, affordable_upgrades)) {
            num_upgrades -= affordable_upgrades;
            ns.printf("INFO upgraded for %d, left: %d", affordable_upgrades, num_upgrades);
        } else {
            ns.printf("INFO can't afford any upgrades yet");
            await ns.sleep(SLEEP_PERIOD_MS);
        }
    }
}

async function upgradeAsZero(ns, node_idx) {
    const log_msg = ns.sprintf("upgrading node %d as zero node", node_idx);
    ns.printf("INFO %s", log_msg);

    const zero_node_stats = ns.hacknet.getNodeStats(0);  // level, ram, cores
    const node_stats = ns.hacknet.getNodeStats(node_idx);
    const level_steps = zero_node_stats.level - node_stats.level;
    const ram_steps = Math.log2(zero_node_stats.ram / node_stats.ram);
    const core_steps = zero_node_stats.cores - node_stats.cores;

    ns.printf("INFO upgrading level for %d", level_steps);
    await waitUpgradeNode(ns, node_idx, level_steps, ns.hacknet.getLevelUpgradeCost, ns.hacknet.upgradeLevel);
    ns.printf("INFO upgrading ram for %d", ram_steps)
    await waitUpgradeNode(ns, node_idx, ram_steps, ns.hacknet.getRamUpgradeCost, ns.hacknet.upgradeRam);
    ns.printf("INFO upgrading cores for %d", core_steps);
    await waitUpgradeNode(ns, node_idx, core_steps, ns.hacknet.getCoreUpgradeCost, ns.hacknet.upgradeCore);

    ns.printf("INFO DONE %s", log_msg);
}

function getUpgradeAsZeroCost(ns, node_idx) {
    const zero_node_stats = ns.hacknet.getNodeStats(0);  // level, ram, cores
    const node_stats = ns.hacknet.getNodeStats(node_idx);
    const level_steps = zero_node_stats.level - node_stats.level;
    const ram_steps = Math.log2(zero_node_stats.ram / node_stats.ram);
    const core_steps = zero_node_stats.cores - node_stats.cores;

    return (ns.hacknet.getLevelUpgradeCost(node_idx, level_steps)
            + ns.hacknet.getRamUpgradeCost(node_idx, ram_steps)
            + ns.hacknet.getCoreUpgradeCost(node_idx, core_steps));
}

function isZeroFullyUpgraded(upgrade_costs) {
    return Math.min(...upgrade_costs.slice(1)) == Infinity;
}

export async function main(ns) {
    ns.printf("INFO getting args");
    const max_hours_to_pay_off = Number(ns.args[0]);
    if (isNaN(max_hours_to_pay_off)) {
        throw "Please specify first arg, max_hours_to_pay_off, which is now " + max_hours_to_pay_off;
    }
    ns.printf("INFO max_hours_to_pay_off = %d", max_hours_to_pay_off);

    let num_nodes = ns.hacknet.numNodes();
    ns.printf("INFO now there are %d nodes", num_nodes);

    if (!num_nodes) {
        if (ns.read(FILENAME_WITH_FULL_UPGRADE_COST).length) {
            ns.printf("INFO clearing file %s with full upgrade cost since we have restart",
                      FILENAME_WITH_FULL_UPGRADE_COST);
            ns.clear(FILENAME_WITH_FULL_UPGRADE_COST);
        }
        ns.printf("INFO there are no nodes yet, so we buy zero node");
        num_nodes = await waitBuyNode(ns) + 1;
    }

    ns.printf("INFO making sure all nodes are upgraded like zero one");
    for (let i = 1; i < num_nodes; ++i) {
        await upgradeAsZero(ns, i);
    }
    ns.printf("INFO DONE making sure all nodes are upgraded like zero one");

    let upgrade_costs = [
        ns.hacknet.getPurchaseNodeCost(),
        ns.hacknet.getLevelUpgradeCost(0, 1),
        ns.hacknet.getRamUpgradeCost(0, 1),
        ns.hacknet.getCoreUpgradeCost(0, 1),
    ];
    let fully_upgraded = isZeroFullyUpgraded(upgrade_costs);
    while (!fully_upgraded) {
        let upgrade_type = upgrade_costs.indexOf(Math.min(...upgrade_costs));
        // if we buy new node, we upgrade it like zero one
        // if we upgrade zero node, we upgrade all other as well
        switch (upgrade_type) {
          case 0:
            num_nodes = await waitBuyNode(ns) + 1;
            await upgradeAsZero(ns, num_nodes - 1);
            upgrade_costs[upgrade_type] = ns.hacknet.getPurchaseNodeCost();
            break;
          case 1:
            for (let i = 0; i < num_nodes; ++i) {
                ns.printf("INFO upgrading level for %d node", i);
                await waitUpgradeNode(ns, i, 1, ns.hacknet.getLevelUpgradeCost, ns.hacknet.upgradeLevel);
            }
            upgrade_costs[upgrade_type] = ns.hacknet.getLevelUpgradeCost(0, 1);
            break;
          case 2:
            for (let i = 0; i < num_nodes; ++i) {
                ns.printf("INFO upgrading ram for %d node", i);
                await waitUpgradeNode(ns, i, 1, ns.hacknet.getRamUpgradeCost, ns.hacknet.upgradeRam);
            }
            upgrade_costs[upgrade_type] = ns.hacknet.getRamUpgradeCost(0, 1);
            break;
          case 3:
            for (let i = 0; i < num_nodes; ++i) {
                ns.printf("INFO upgrading cores for %d node", i);
                await waitUpgradeNode(ns, i, 1, ns.hacknet.getCoreUpgradeCost, ns.hacknet.upgradeCore);
            }
            upgrade_costs[upgrade_type] = ns.hacknet.getCoreUpgradeCost(0, 1);
            break;
          default:
            throw ns.sprintf("Unknown upgrade type: %d", upgrade_type)
        }
        fully_upgraded = isZeroFullyUpgraded(upgrade_costs);
    }
    ns.printf("INFO zero node is fully upgraded");
    // now, when zero node is fully upgraded, we can know max production and full upgrade cost

    const max_node_production = ns.hacknet.getNodeStats(0).production;
    ns.printf("INFO max node production: %s per second", nF(ns, max_node_production));

    let full_upgrade_cost = Infinity;
    if (!ns.read(FILENAME_WITH_FULL_UPGRADE_COST).length) {
        num_nodes = await waitBuyNode(ns) + 1;
        full_upgrade_cost = getUpgradeAsZeroCost(ns, num_nodes - 1);
        ns.printf("INFO saving full upgrade cost %s to %s", nF(ns, full_upgrade_cost), FILENAME_WITH_FULL_UPGRADE_COST);
        ns.write(FILENAME_WITH_FULL_UPGRADE_COST, JSON.stringify(full_upgrade_cost), "w");
        await upgradeAsZero(ns, num_nodes - 1);
    } else {
        full_upgrade_cost = JSON.parse(ns.read(FILENAME_WITH_FULL_UPGRADE_COST));
        ns.printf("INFO full upgrade cost %s was read from %s", nF(ns, full_upgrade_cost), FILENAME_WITH_FULL_UPGRADE_COST);
    }

    // and, since we know max production and full upgrade cost, we can calculate hours to pay off
    let new_node_cost = ns.hacknet.getPurchaseNodeCost() + full_upgrade_cost;
    let hours_to_pay_off = new_node_cost / max_node_production / 3600;
    while (hours_to_pay_off <= max_hours_to_pay_off) {
        ns.printf("INFO new node cost: %s, hours to pay off: %f", nF(ns, new_node_cost), hours_to_pay_off);
        num_nodes = await waitBuyNode(ns) + 1;
        await upgradeAsZero(ns, num_nodes - 1);
        new_node_cost = ns.hacknet.getPurchaseNodeCost() + full_upgrade_cost;
        hours_to_pay_off = new_node_cost / max_node_production / 3600;
    }
    const msg = ns.sprintf("INFO new node cost: %s; hours to pay off = %f > %f = max hours to pay off",
                           nF(ns, new_node_cost), hours_to_pay_off, max_hours_to_pay_off);
    ns.print(msg);
    ns.tprint(msg);
}