"use strict";

const PLAYERS_PANEL = {
    HEADER: 0,
    RUNESTABLE: 2
};

const PLAYERSTB_COLUMN = {
    NAME: 0,
    QUANTITY: 1,
    PRICE: 2
}

const LOOTTB_COLUMN = {
    NAME: 0,
    QUANTITY: 1,
    PRICE: 2,
    DELETE: 3
};

const LOCATIONTB_COLUMN = {
    NAME: 0,
    WEIGHT: 1,
    PRICE: 2
};

var mediviadb;

// Templates
var notification_template,
playerpanel_template,
locationtable_template,
npctbody_template;

// HTML Elements
var tooltip,
sidebar_menu,
notification_container,
players_grid,
loottable,
loottable_panel,
loottable_body,
addcreature_panel,
addcreature_name,
huntinfo,
huntinfo_panel,
huntinfo_totalwaste,
huntinfo_totalearnings,
huntinfo_profit,
huntinfo_splitprofit,
huntinfo_playerstable,
huntinfo_selllocation;

// Config HTML Elements
var ac_minimum_price,
ac_minimum_weight;

// Misc
var url_params = new URLSearchParams(window.location.search);
var notification_count = 0;
var autocomplete_lastsize = 0;
var addcreature_autocomplete_lastindex = -1;
var is_sidebar_open = false;

function clamp(value, min, max) {
    if (value < min) return min;
    if (value > max) return max;
    return value;
}

function init() {
    fetch("db.json")
    .then((resp) => resp.json())
    .then(function(data) {
        mediviadb = data;
        huntinfo_create_location_rows();

        let state_param = url_params.get('state');
        if (state_param) {
            parse_state_string(state_param);
            huntinfo_calculate_loot();
        }
        if (players().length <= 1) {
            players_add_player();
            player(1).querySelector(".playername").focus();
            player(1).querySelector(".playername").setSelectionRange(0, 100);
        }
        loottable_add_row();
        load_config();

        document.getElementById("loading-icon").remove();
        document.getElementById("main-container").style.display = "block";
    });

    playerpanel_template = document.getElementById("playerpanel-template");
    locationtable_template = document.getElementById("locationtable-template");
    npctbody_template = document.getElementById("npctbody-template");
    notification_template = document.getElementById("notification-template");

    tooltip = document.querySelector(".tooltip");
    sidebar_menu = document.querySelector(".sidebar-menu");
    notification_container = document.querySelector(".notification-container");

    players_grid = document.getElementById("playersgrid");

    loottable = document.getElementById("loottb");
    loottable_panel = document.getElementById("loottable_panel");
    loottable_body = loottable.getElementsByTagName("tbody")[0];

    addcreature_panel = document.getElementById("loottb_addcreatureitems");
    addcreature_name = document.getElementById("loottb_creaturename");

    huntinfo = document.getElementById("huntinfo");
    huntinfo_panel = document.getElementById("huntinfo_panel");
    huntinfo_totalwaste = document.getElementById("huntinfo_totalwaste");
    huntinfo_totalearnings = document.getElementById("huntinfo_totalearnings");
    huntinfo_profit = document.getElementById("huntinfo_profit");
    huntinfo_splitprofit = document.getElementById("huntinfo_splitprofit");
    huntinfo_playerstable = document.getElementById("huntinfo_playerstb");
    huntinfo_selllocation = document.getElementById("huntinfo_selllocation");

    ac_minimum_price = document.getElementById("ac-minimum-price");
    ac_minimum_weight = document.getElementById("ac-minimum-weight");

    document.body.addEventListener("keydown", onkeydown_global);

    // Tooltip.
    setInterval(() => {
        const hovered_elements = document.querySelectorAll(":hover");
        const hovered_element = hovered_elements[hovered_elements.length - 1];
        if (hovered_element == tooltip) return;

        if (hovered_element) {
            if (hovered_element.dataset.tooltip) {
                tooltip.innerText = hovered_element.dataset.tooltip;
                if (tooltip.style.display == "none") tooltip.style.display = "block";
                const element_rect = hovered_element.getBoundingClientRect();
                let tooltipX = clamp(parseInt(element_rect.x), 0, document.body.clientWidth - element_rect.width);
                let tooltipY = clamp(parseInt(element_rect.y - tooltip.offsetHeight), 0, document.body.clientHeight - element_rect.height);
                tooltip.style.left = `${tooltipX}px`;
                tooltip.style.top = `${tooltipY}px`;
            } else {
                tooltip.style.display = "none";
            }
        }
    }, 500);
}

function stoi(str) {
    if (!str || str == "") return 0;
    else return parseInt(str);
}

function stof(str) {
    if (!str || str == "") return 0;
    else return parseFloat(str);
}

function stog(gold_text) {
    if (gold_text == "") return 0;
    let splittext = gold_text.split(" ");
    let num = Number(splittext[0]);
    if (num[0] == 0) return 0;

    splittext[1].toUpperCase();
    if (splittext[1] == "K")
        num *= 1000;
    else if (splittext[1] == "KK")
        num *= 1000000;
    return parseInt(num);
}

function gtos(amount) {
    const abs_amount = Math.abs(amount);
    if (abs_amount < 1000) return parseInt(amount) + " GP";
    else if (abs_amount < 1000000) return (amount / 1000).toFixed(1) + " K";
    else return (abs_amount / 1000000).toFixed(3) + " KK";
}

function copy_to_clipboard(text) {
    const el = document.createElement("textarea");
    el.value = text;
    el.style.position = "absolute";
    el.style.left = "-9999px";
    document.body.appendChild(el);
    el.select();
    document.execCommand("copy");
    document.body.removeChild(el);
}

// ------------------------------------------
// General stuff
// ------------------------------------------

function generate_wikilink(name) {
    return "https://wiki.mediviastats.info/" + name.replace(/ /g, "_");
}

function save_config() {
    localStorage.setItem("ac-minimum-price", stoi(ac_minimum_price.value));
    localStorage.setItem("ac-minimum-weight", stof(ac_minimum_weight.value));
    display_notification("Configuration saved successfully");
}

function load_config(display_message = false) {
    load(ac_minimum_price, 'ac-minimum-price');
    load(ac_minimum_weight, 'ac-minimum-weight');
    if (display_message) display_notification("Configuration loaded successfully");

    function load(el, key) {
        let val = localStorage.getItem(key);
        if (val && val != "0") el.value = val;
    }
}

function remove_notification(element) {
    if (!element.wasRemoved) {
        element.wasRemoved = true;
        element.style.transitionDuration = "0.3s";
        element.style.transform = `translateY(calc(-${100 * notification_count}% - ${notification_count}em))`;
        setTimeout(() => {
            element.remove();
        }, 300);
        --notification_count;
    }
}

function display_notification(text) {
    let element = document.importNode(notification_template.content, true).querySelector(".notification");
    ++notification_count;
    element.style.transitionDuration = `0.3s`;
    element.style.willChange = "transform";
    element.style.transform = `translateY(calc(-${100 * notification_count}% - ${notification_count}em))`;
    let el_text = element.querySelector(".notification-text");
    el_text.innerText = text;
    notification_container.insertBefore(element, notification_container.firstChild);
    setTimeout(() => element.style.transform = "translateY(0)", 1);

    setTimeout(() => remove_notification(element), 4000);
}

function open_sidebar_menu() {
    sidebar_menu.style.setProperty("display", "block");
    setTimeout(() => sidebar_menu.classList.add("sidebar-menu-open"), 1);
    is_sidebar_open = true;
}

function close_sidebar_menu() {
    sidebar_menu.classList.remove("sidebar-menu-open");
    setTimeout(() => sidebar_menu.style.setProperty("display", "none"), 300);
    is_sidebar_open = false;
}

// Takes an array of objects with a 'name' field to be searched and returns the index that was found, or -1 on failure.
function autocomplete_generic(item_array, input_field, validate_item = null) {
    if (autocomplete_lastsize >= input_field.value.length) {
        autocomplete_lastsize = input_field.value.length;
        return -1;
    }

    autocomplete_lastsize = input_field.value.length;
    let inputlen = input_field.value.length;
    let suggestion_index = -1;
    for (let i = 0; i < item_array.length; i++) {
        if (inputlen > item_array[i].name.length) continue;
        if (input_field.value.toLowerCase() == item_array[i].name.substr(0, inputlen).toLowerCase()) {
            if (validate_item && !validate_item(item_array[i])) continue;
            input_field.value = item_array[i].name;
            input_field.setSelectionRange(inputlen, item_array[i].name.length);
            suggestion_index = i;
            break;
        }
    }
    return suggestion_index;
}

function generate_share_link() {
    let player_str = "";
    let str_arr = [];
    let gold_quant = stoi(document.getElementById("loottb_gold_itemquantity").value)

    for (let p = 1; p < players().length; p++) {
        let cur_player_name = player(p).querySelector(".playername").value
        if (!cur_player_name || cur_player_name == "")
            continue;

        let runestable = player(p).querySelector(".runestable");
        let runes_str = get_data_string(runestable, "runes");

        let otherstable = player(p).querySelector(".otherstable");
        let others_str = get_data_string(otherstable, "players_otheritems");

        if (!runes_str && !others_str) continue;
        str_arr.push(`${cur_player_name}{${runes_str};${others_str}}`);
    }
    player_str = str_arr.join("")
    str_arr = [];
    for (let i = 0; i < loottable_body.rows.length - 1; i++) {
        let cur_row = loottable_body.rows[i];

        let is_index = !(!cur_row.dataset.itemindex || cur_row.dataset.itemindex == -1);

        let cur_name_or_index;
        if (is_index) cur_name_or_index = cur_row.dataset.itemindex;
        else cur_name_or_index = cur_row.cells[LOOTTB_COLUMN.NAME].firstChild.value.replaceAll(" ", "+");

        let cur_quant = stoi(cur_row.cells[LOOTTB_COLUMN.QUANTITY].firstChild.value);
        let cur_price_or_default = stoi(cur_row.cells[LOOTTB_COLUMN.PRICE].firstChild.value);

        if (cur_name_or_index == ""
            || !cur_quant || cur_quant <= 0
            || !cur_price_or_default || cur_price_or_default <= 0)
            continue;
        if (is_index && cur_price_or_default == mediviadb.items[cur_name_or_index].price)
            cur_price_or_default = "-";

        str_arr.push(`${cur_name_or_index},${cur_quant},${cur_price_or_default}`)
    }

    let share_link = encodeURI(`${location.origin}${location.pathname}?state=${gold_quant};${player_str};${str_arr.join(":")}`);
    copy_to_clipboard(share_link);
    display_notification("The link to the current state has been copied to your clipboard");

    function get_data_string(table, dbname) {
        let arr = [];
        for (let i = 1; i < table.rows.length; i++) {
            let cur_quant = stoi(table.rows[i].cells[PLAYERSTB_COLUMN.QUANTITY].firstChild.value);
            let cur_price_or_default = stoi(table.rows[i].cells[PLAYERSTB_COLUMN.PRICE].firstChild.value);

            if (!cur_price_or_default || cur_price_or_default <= 0
                || !cur_quant || cur_quant <= 0)
                continue;
            if (cur_price_or_default == mediviadb[dbname][i - 1].price)
                cur_price_or_default = "-";

            arr.push(`${i},${cur_quant},${cur_price_or_default}`);
        }
        if (arr.length == 0) return "";
        else return arr.join(":");
    }
}

function parse_state_string(state) {
    state += ";"
    let cursor = 0;
    let cur_player_index = 0;
    let cur_player = null;

    cursor = state.indexOf(";");
    let gold_quant = state.substr(0, cursor);
    if (gold_quant > 0) document.getElementById("loottb_gold_itemquantity").value = gold_quant;
    let cursor_start = ++cursor;

    parse_players:
    while (cursor < state.length) {
        switch (state.charAt(cursor)) {
            case ";": {
                ++cursor;
                cursor_start = cursor;
            } break parse_players;

            case "{": {
                ++cur_player_index;
                players_add_player();
                cur_player = player(cur_player_index);
                cur_player.querySelector(".playername").value = state.substr(cursor_start, cursor - cursor_start);
                cursor_start = cursor + 1;

                let runes = parse_items();
                if (runes) {
                    let runestable = cur_player.querySelector(".runestable");
                    for (let i = 0; i < runes.length; ++i) {
                        runestable.rows[runes[i][0]].cells[PLAYERSTB_COLUMN.QUANTITY].firstChild.value = runes[i][1];

                        let el = runestable.rows[runes[i][0]].cells[PLAYERSTB_COLUMN.PRICE].firstChild;
                        if (runes[i][2] == "-")
                            el.value = mediviadb.runes[runes[i][0] - 1].price;
                        else el.value = runes[i][2];
                    }
                }

                let others = parse_items();
                if (others) {
                    let otherstable = cur_player.querySelector(".otherstable");
                    for (let i = 0; i < others.length; ++i) {
                        otherstable.rows[others[i][0]].cells[PLAYERSTB_COLUMN.QUANTITY].firstChild.value = others[i][1];

                        let el = otherstable.rows[others[i][0]].cells[PLAYERSTB_COLUMN.PRICE].firstChild;
                        if (others[i][2] == "-")
                            el.value = mediviadb.players_otheritems[others[i][0] - 1].price;
                        else el.value = others[i][2];
                    }
                }

                --cursor; // We need to back one just so that the loop registers the exit
            } break;

            case "}": {
                cursor_start = cursor + 1;
                cur_player = null;
            } break;
        }
        ++cursor;
    }

    let loot = parse_items();
    if (loot) {
        for (let i = 0; i < loot.length; ++i) {
            let row = loottable_add_row();
            let is_index = false;
            if (isNaN(loot[i][0])) row.cells[LOOTTB_COLUMN.NAME].firstChild.value = loot[i][0];
            else {
                is_index = true;
                row.dataset.itemindex = loot[i][0];
                row.cells[LOOTTB_COLUMN.NAME].firstChild.value = mediviadb.items[stoi(loot[i][0])].name;
            }
            row.cells[LOOTTB_COLUMN.QUANTITY].firstChild.value = loot[i][1];

            let el = row.cells[LOOTTB_COLUMN.PRICE].firstChild
            if (is_index && loot[i][2] == "-")
                el.value = mediviadb.items[loot[i][0]].price;
            else el.value = loot[i][2];
        }
    }

    function parse_items() {
        let ret_arr = [];
        let cur_obj = [];

        parse_item:
        while (cursor < state.length) {
            switch (state.charAt(cursor)) {
                case ";":
                case "}":
                    let sub = state.substr(cursor_start, cursor - cursor_start);
                    if (sub && sub != "") cur_obj.push(sub);
                    if (cur_obj.length > 0) ret_arr.push(cur_obj);
                    cursor_start = cursor + 1;
                break parse_item;

                case ",":
                case ":":
                    cur_obj.push(state.substr(cursor_start, cursor - cursor_start));
                    cursor_start = cursor + 1;

                    if (state.charAt(cursor) == ":") {
                        ret_arr.push(cur_obj);
                        cur_obj = [];
                    }
                break;
            }
            ++cursor;
        }
        ++cursor;

        if (ret_arr.length == 0) return null;
        return ret_arr;
    }
}

function flash_panel(panel) {
    panel.classList.add("panel-flash");
    setTimeout(() => {
        panel.classList.remove("panel-flash");
    }, 50);
}

// ------------------------------------------
// Functions pertaining to the players panel
// ------------------------------------------

function players() { return players_grid.children; }
function player(index) { return players_grid.children[index]; }

function players_add_player() {
    let newpanel = document.importNode(playerpanel_template.content, true);
    let runestable = newpanel.querySelector(".runestable");
    let otherstable = newpanel.querySelector(".otherstable");

    populate_table(runestable, mediviadb.runes);
    populate_table(otherstable, mediviadb.players_otheritems);

    function populate_table(tb, dbarray) {
        let newrow, rowlbl, rowquant, rowprice;
        for (let i = 0; i < dbarray.length; i++) {
            newrow = tb.insertRow();
            rowlbl = document.createElement("label");
            rowlbl.innerText = dbarray[i].name;
            newrow.insertCell().appendChild(rowlbl);

            rowquant = document.createElement("input");
            rowquant.type = "number";
            rowquant.setAttribute("min", "0");
            rowquant.setAttribute("placeholder", "0");
            newrow.insertCell().appendChild(rowquant);

            rowprice = document.createElement("input");
            rowprice.type = "number";
            rowprice.setAttribute("min", "0");
            rowprice.setAttribute("step", "100");
            rowprice.setAttribute("placeholder", "0");
            if (localStorage.getItem(dbarray[i].name + "_price") === null)
                rowprice.value = dbarray[i].price;
            else
                rowprice.value = localStorage.getItem(dbarray[i].name + "_price");
            newrow.insertCell().appendChild(rowprice);
        }
    }

    return players_grid.appendChild(newpanel);
}

function player_delete(callerpanel) {
    callerpanel.remove();
    if (players().length <= 1) players_add_player();
}

function players_clear() {
    while (players().length > 1)
        players_grid.lastChild.remove();
}

function save_default_prices(player_content) {
    save_table_prices(player_content.querySelector(".runestable"));
    save_table_prices(player_content.querySelector(".otherstable"));
    function save_table_prices(table) {
        for (let i = 1; i < table.rows.length; ++i) {
            let rowName = table.rows[i].cells[PLAYERSTB_COLUMN.NAME].firstChild.innerText + "_price";
            let rowPrice = table.rows[i].cells[PLAYERSTB_COLUMN.PRICE].firstChild.value;
            localStorage.setItem(rowName, rowPrice);
        }
    }
    display_notification("Prices were saved succesfully");
    flash_panel(player_content);
}

function clear_player_items(player_content) {
    clear_table_quantity(player_content.querySelector(".runestable"))
    clear_table_quantity(player_content.querySelector(".otherstable"))
    function clear_table_quantity(table) {
        for (let i = 1; i < table.rows.length; ++i)
            table.rows[i].cells[PLAYERSTB_COLUMN.QUANTITY].firstChild.value = "";
    }
    flash_panel(player_content);
}

// --------------------------------------
// Functions pertaining to the loottable
// --------------------------------------

function loottable_add_row() {
    let row_index = loottable_body.rows.length;
    let row = loottable_body.insertRow();

    let itemname = document.createElement("input");
    itemname.type = "text";
    itemname.setAttribute("oninput", "autocomplete_itemname(parentElement.parentElement)");
    itemname.setAttribute("onfocusin", "loottable_check_add_row(parentElement.parentElement)");
    itemname.setAttribute("onfocusout", "autocomplete_lastsize = 0;");
    if (row_index > 0)
        loottable_body.rows[row_index - 1].cells[LOOTTB_COLUMN.NAME].firstChild.removeAttribute("onfocusin");
    row.insertCell().appendChild(itemname);

    let itemquantity = document.createElement("input");
    itemquantity.type = "number";
    itemquantity.setAttribute("min", "0");
    itemquantity.setAttribute("placeholder", "0");
    row.insertCell().appendChild(itemquantity);

    let itemprice = document.createElement("input");
    itemprice.type = "number";
    itemprice.setAttribute("min", "0");
    itemprice.setAttribute("step", "100");
    itemprice.setAttribute("placeholder", "0");
    row.insertCell().appendChild(itemprice);

    // Add a delete button if it's not the first row
    if (row_index >= 0) {
        let deletebutton = document.createElement("button");
        deletebutton.className = "red-button loottable-button";
        deletebutton.setAttribute("onclick", "loottable_delete_row(parentElement.parentElement)");
        deletebutton.innerText = "X";
        deletebutton.tabIndex = -1;
        row.insertCell().appendChild(deletebutton);
    }
    row.setAttribute("data-itemindex", -1);
    return row;
}

function loottable_check_add_row(callerrow) {
    if (loottable.rows[callerrow.rowIndex - 1].cells[LOOTTB_COLUMN.NAME].firstChild.value != "")
        loottable_add_row();
}

// @Improvement: We can keep track of the selected row index so we can select the same index or the previous one if that doesn't exist.
function loottable_delete_row(callerrow) {
    if (callerrow.rowIndex == loottable.rows.length - 1) {
        if (loottable.rows[callerrow.rowIndex - 1].cells[LOOTTB_COLUMN.NAME].firstChild.value == "")
            loottable.rows[callerrow.rowIndex - 1].cells[LOOTTB_COLUMN.NAME].firstChild.setAttribute("onfocusin", "loottable_check_add_row(parentElement.parentElement)");
        else return;
    }
    loottable_body.deleteRow(callerrow.sectionRowIndex);
}

function loottable_clear() {
    flash_panel(loottable_panel);
    while (loottable_body.lastChild)
        loottable_body.lastChild.remove();
    loottable_add_row();

    let gold_quant = document.getElementById("loottb_gold_itemquantity");
    gold_quant.value = "";
    gold_quant.focus();
}

function autocomplete_itemname(callerrow) {
    let callerrow_itemname = callerrow.cells[LOOTTB_COLUMN.NAME].firstChild;
    let callerrow_itemprice = callerrow.cells[LOOTTB_COLUMN.PRICE].firstChild;
    let index = -1;

    if (stoi(ac_minimum_price.value) > 0) {
        index = autocomplete_generic(mediviadb.items, callerrow_itemname, (item) => {
            if (item.weight < stof(ac_minimum_weight.value)) return true;
            else return item.price < stoi(ac_minimum_price.value) ? false : true;
        });
    } else index = autocomplete_generic(mediviadb.items, callerrow_itemname);

    if (index == -1) callerrow_itemprice.value = "";
    else callerrow_itemprice.value = mediviadb.items[index].price;
    callerrow.setAttribute("data-itemindex", index);
    return index;
}

function autocomplete_creature_items() {
    addcreature_autocomplete_lastindex = autocomplete_generic(mediviadb.creatures, addcreature_name);
}

function loottable_show_creature_items() {
    addcreature_panel.style.display = "grid";
    addcreature_name.focus();
}

function loottable_hide_creature_items() {
    addcreature_name.value = "";
    addcreature_panel.style.display = "none";

    // Select first row which has an empty quantity value
    for (let i = 0; i < loottable_body.rows.length; i++) {
        let cur_quant = loottable_body.rows[i].cells[LOOTTB_COLUMN.QUANTITY].firstChild;
        if (cur_quant.value == "") {
            cur_quant.scrollIntoView(false);
            cur_quant.focus();
            break;
        }
    }
}

function loottable_add_creature_items() {
    flash_panel(loottable_panel);
    if (addcreature_autocomplete_lastindex == -1) {
        display_notification("Unable to find a creature with this name");
        return;
    }
    let creature = mediviadb.creatures[addcreature_autocomplete_lastindex];

    let skip_item;
    for (let i = 0; i < creature.items.length; i++) {
        let loottb_length = loottable_body.rows.length;
        skip_item = false;
        for (let j = 0; j < loottb_length; j++) {
            if (creature.items[i] == loottable_body.rows[j].cells[LOOTTB_COLUMN.NAME].firstChild.value) {
                skip_item = true;
                break;
            }
        }
        if (skip_item) continue;

        autocomplete_lastsize = 0;
        let row = loottable_body.rows[loottb_length - 1];
        row.cells[LOOTTB_COLUMN.NAME].firstChild.value = creature.items[i];
        let index = autocomplete_itemname(row);
        if (index == -1) {
            loottable_body.deleteRow(row.sectionRowIndex);
        }
        loottable_add_row();
    }

    addcreature_panel.scrollIntoView();
    addcreature_name.value = "";
    autocomplete_creature_items();
}

// @HACK: Nasty bugfix - we need a major refactor on how we deal with tables
function loottable_on_focus_out() {
    if (loottable.rows[loottable.rows.length - 1].cells[LOOTTB_COLUMN.NAME].firstChild.value == "" &&
        loottable.rows[loottable.rows.length - 2].cells[LOOTTB_COLUMN.NAME].firstChild.value == "")
        loottable_delete_row(loottable.rows[loottable.rows.length - 1]);
}

// ----------------------------------
// Functions pertaining to hunt info
// ----------------------------------

function huntinfo_create_location_rows() {
    for (let i = 0; i < mediviadb.locations.length; i++) {
        let newtable = document.importNode(locationtable_template.content, true).querySelector(".locationtable");
        newtable.tHead.rows[0].cells[LOCATIONTB_COLUMN.NAME].innerText = mediviadb.locations[i].name;
        huntinfo_selllocation.appendChild(newtable);
    }

    let playerstb = document.importNode(locationtable_template.content, true).querySelector(".locationtable");
    playerstb.tHead.rows[0].cells[LOCATIONTB_COLUMN.NAME].innerText = "Players";
    let tbody = document.createElement("tbody");
    tbody.className = "npctbody";
    playerstb.appendChild(tbody);
    huntinfo_selllocation.appendChild(playerstb);
}

function huntinfo_copy_as_text() {
    let total_waste = document.getElementById("huntinfo_totalwaste").innerText;
    let total_earnings = document.getElementById("huntinfo_totalearnings").innerText;
    let profit = document.getElementById("huntinfo_profit").innerText;
    let split_profit = document.getElementById("huntinfo_splitprofit").innerText;
    let player_info_rows = document.getElementById("huntinfo_playerstb").rows;
    const max_line_length = 72;
    const divider = "-".repeat(max_line_length + 4);

    let output_string = `\`\`\`
${get_table_line(["Total Waste", "Total Earnings", "Profit", "Split Profit"], "-")}
${get_table_line([total_waste, total_earnings, profit, split_profit], " ")}`;

    if (player_info_rows.length > 1) {
        output_string += "\n" + get_table_line(["Player", "Supplies Used", "Share"], "-");
        for (let i = 1; i < player_info_rows.length; ++i) {
            let row = player_info_rows[i];
            output_string += "\n" + get_table_line([
                row.cells[0].firstChild.innerText,
                row.cells[1].firstChild.innerText,
                row.cells[2].firstChild.innerText,
            ], i % 2 == 1 ? " " : ":");
        }
    }
    output_string += "\n" + divider + "\n```";

    copy_to_clipboard(output_string);
    display_notification("Table info has been copied to your clipboard as text");

    function get_table_line(values, separator) {
        let output_string = "-";
        let max_div_length = (max_line_length) / values.length;

        for (let i = 0; i < values.length; ++i) {
            let el_length = values[i].length + 2;

            if (i == values[i].length - 1) ++el_length;
            if (i == 0) output_string += " ";
            if (el_length % 2 == 1) {
                output_string += separator;
                ++el_length;
            }

            output_string += separator.repeat((max_div_length - el_length) / 2) + " " + values[i] +
                             " " + separator.repeat((max_div_length - el_length) / 2);

            if (i == values.length - 1) output_string += " ";
        }
        output_string += "-".repeat(max_line_length % values.length + 1)
        return output_string;
    }
}

function huntinfo_calculate_loot() {
    flash_panel(huntinfo_panel);

    // Calculate waste
    let totalwaste = 0;
    let playerwaste, runestable, otherstable;
    for (let i = 1; i < players().length; i++) {
        playerwaste = 0;
        runestable = player(i).querySelector(".runestable");
        for (let j = 1; j < runestable.rows.length; j++) {
            playerwaste += stoi(runestable.rows[j].cells[PLAYERSTB_COLUMN.PRICE].firstChild.value) *
                           stoi(runestable.rows[j].cells[PLAYERSTB_COLUMN.QUANTITY].firstChild.value);
        }
        otherstable = player(i).querySelector(".otherstable");
        for (let j = 1; j < otherstable.rows.length; j++) {
            playerwaste += stoi(otherstable.rows[j].cells[PLAYERSTB_COLUMN.PRICE].firstChild.value) *
                           stoi(otherstable.rows[j].cells[PLAYERSTB_COLUMN.QUANTITY].firstChild.value);
        }
        player(i).setAttribute("data-waste", playerwaste);
        totalwaste += playerwaste;
    }
    huntinfo_totalwaste.innerText = gtos(totalwaste);

    // Calculate profit
    let totalearnings = 0;
    totalearnings += stoi(document.getElementById("loottb_gold_itemquantity").value);

    let cur_row;
    for (let i = 0; i < loottable_body.rows.length; i++) {
        cur_row = loottable_body.rows[i];
        totalearnings += stoi(cur_row.cells[LOOTTB_COLUMN.PRICE].firstChild.value * stoi(cur_row.cells[LOOTTB_COLUMN.QUANTITY].firstChild.value));
    }
    let splitprofit = (totalearnings - totalwaste) / (players().length - 1);

    huntinfo_totalearnings.innerText = gtos(totalearnings);
    huntinfo_profit.innerText = gtos(totalearnings - totalwaste);
    huntinfo_splitprofit.innerText = gtos(splitprofit);
    if (splitprofit > 0) {
        huntinfo_profit.style.color = "green";
        huntinfo_splitprofit.style.color = "green";
    } else if (splitprofit < 0) {
        huntinfo_profit.style.color = "red";
        huntinfo_splitprofit.style.color = "red";
    } else {
        huntinfo_profit.style.color = "var(--detail-color)";
        huntinfo_splitprofit.style.color = "var(--detail-color)";
    }

    // Calculate player shares
    if (players().length > 2) {
        for (let i = huntinfo_playerstable.rows.length - 1; i > 0; i--)
            huntinfo_playerstable.deleteRow(i);

        let row, plname, plsupplies, plshare;
        for (let i = 1; i < players().length; i++) {
            row = huntinfo_playerstable.insertRow();

            plname = document.createElement("label");
            plname.innerText = player(i).querySelector(".playername").value;
            row.insertCell().appendChild(plname);

            plsupplies = document.createElement("label");
            plsupplies.innerText = gtos(player(i).getAttribute("data-waste"));
            row.insertCell().appendChild(plsupplies);

            plshare = document.createElement("label");
            plshare.innerText = gtos(stoi(player(i).getAttribute("data-waste")) + splitprofit);
            row.insertCell().appendChild(plshare);
        }
        huntinfo_playerstable.style.display = "table";
    } else huntinfo_playerstable.style.display = "none";

    // Find out where to sell the loot
    if (loottable_body.rows.length > 1 && loottable_body.rows[0].cells[LOOTTB_COLUMN.NAME].firstChild.value != "") {
        let skipempty = false;
        if (totalearnings > 0) skipempty = true;

        // Clear npc location tables
        for (let i = huntinfo_selllocation.children.length - 1; i > 0; i--) {
            huntinfo_selllocation.children[i].style.display = "none";
            for (let j = huntinfo_selllocation.children[i].tBodies.length - 1; j >= 0; j--)
                huntinfo_selllocation.children[i].tBodies[j].remove();
        }
        let playerstbody = document.createElement("tbody");
        playerstbody.className = "npctbody";
        huntinfo_selllocation.lastChild.appendChild(playerstbody);

        // Fill out location weights
        let item_index, npc_index, location_index;
        let locations_weights = new Array(mediviadb.locations.length);
        locations_weights.fill(0);
        for (let i = 0; i < loottable_body.rows.length; i++) {
            item_index = loottable_body.rows[i].getAttribute("data-itemindex");
            if (item_index == -1) continue;
            if (skipempty && stoi(loottable_body.rows[i].cells[LOOTTB_COLUMN.QUANTITY].firstChild.value) <= 0) continue;

            // For each NPC the item can be sold to
            for (let j = 0; j < mediviadb.items[item_index].sellto.length; j++) {
                if (mediviadb.items[item_index].sellto[j] == "Players")
                    continue;

                npc_index = mediviadb.npcs.findIndex(obj => (obj.name == mediviadb.items[item_index].sellto[j]));
                location_index = mediviadb.locations.findIndex(obj => (obj.name == mediviadb.npcs[npc_index].location));
                locations_weights[location_index] += 2;
                // For each location close to the location, add weight of 1
                for (let k = 0; k < mediviadb.locations[location_index].closeto.length; k++)
                    locations_weights[mediviadb.locations.findIndex(obj => obj.name == mediviadb.locations[location_index].closeto[k])]++;
            }
        }
        // Create an array of location indexes and sort by weight
        let locations_weights_indexes = new Array(locations_weights.length);
        for (let i = 0; i < locations_weights.length; i++)
            locations_weights_indexes[i] = i;
        let swapbuffer;
        for (let i = locations_weights.length; i > 0; i--) {
            for (let j = 1; j < i; j++) {
                if (locations_weights[j] > locations_weights[j - 1]) {
                    swapbuffer = locations_weights[j];
                    locations_weights[j] = locations_weights[j - 1];
                    locations_weights[j - 1] = swapbuffer;

                    swapbuffer = locations_weights_indexes[j];
                    locations_weights_indexes[j] = locations_weights_indexes[j - 1];
                    locations_weights_indexes[j - 1] = swapbuffer;
                }
            }
        }

        // Fill out tables
        let location_tbody;
        for (let i = 0; i < loottable_body.rows.length; i++) {
            if (loottable_body.rows[i].cells[LOOTTB_COLUMN.NAME].firstChild.value == "") continue;
            if (skipempty && stoi(loottable_body.rows[i].cells[LOOTTB_COLUMN.QUANTITY].firstChild.value) <= 0) continue;
            item_index = loottable_body.rows[i].getAttribute("data-itemindex");

            if (item_index == -1 || mediviadb.items[item_index].sellto[0] == "Players")
                location_tbody = huntinfo_selllocation.lastChild.tBodies[0];
            else {
                location_tbody = null;
                for (let j = 0; j < locations_weights_indexes.length; j++) {
                    for (let k = 0; k < mediviadb.items[item_index].sellto.length; k++) {
                        npc_index = mediviadb.npcs.findIndex(obj => (obj.name == mediviadb.items[item_index].sellto[k]));
                        location_index = mediviadb.locations.findIndex(obj => (obj.name == mediviadb.npcs[npc_index].location));

                        if (location_index == locations_weights_indexes[j]) {
                            // Check if there's a tbody for this npc, if not, create one
                            for (let l = 0; l < huntinfo_selllocation.children[location_index + 1].tBodies.length; l++) {
                                let lheader = huntinfo_selllocation.children[location_index + 1].tBodies[l].rows[0].cells[LOCATIONTB_COLUMN.NAME];
                                if (mediviadb.npcs[npc_index].name == lheader.innerText) {
                                    location_tbody = huntinfo_selllocation.children[location_index + 1].tBodies[l];
                                    break;
                                }
                            }
                            if (!location_tbody) {
                                // @Hack: We do the querySelector after importing the node because the template
                                // is surrounded by text elements.
                                location_tbody = document.importNode(npctbody_template.content, true).querySelector(".npctbody");
                                let npcname = location_tbody.querySelector(".npcname");
                                npcname.innerText = mediviadb.npcs[npc_index].name;
                                npcname.href = generate_wikilink(mediviadb.npcs[npc_index].name);
                                npcname.target = "_blank";

                                if (mediviadb.npcs[npc_index].questlink) {
                                    let questanchor = document.createElement("a");
                                    questanchor.href = mediviadb.npcs[npc_index].questlink;
                                    questanchor.target = "_blank";
                                    let questimage = document.createElement("img");
                                    questimage.style.margin = "0px 6px";
                                    questimage.src = "imgs/quest.png";
                                    questimage.dataset.tooltip = "Trading with this NPC requires a quest. Click for more information.";
                                    questanchor.appendChild(questimage);
                                    location_tbody.rows[0].cells[LOCATIONTB_COLUMN.NAME].appendChild(questanchor);
                                }

                                location_tbody = huntinfo_selllocation.children[location_index + 1].appendChild(location_tbody);
                            }
                            break;
                        }
                        if (location_tbody) break;
                    }
                    if (location_tbody) break;
                }
            }
            let newrow = location_tbody.insertRow();
            let newanchor = document.createElement("a");
            if (item_index != -1) newanchor.href = generate_wikilink(loottable_body.rows[i].cells[LOOTTB_COLUMN.NAME].firstChild.value);
            newanchor.innerText = loottable_body.rows[i].cells[LOOTTB_COLUMN.NAME].firstChild.value + " [" + stoi(loottable_body.rows[i].cells[LOOTTB_COLUMN.QUANTITY].firstChild.value) + "]";
            newanchor.target = "_blank";
            newrow.insertCell().appendChild(newanchor);

            let newlbl = document.createElement("label");
            if (item_index == -1) newlbl.innerText = "0 oz";
            else newlbl.innerText = (loottable_body.rows[i].cells[LOOTTB_COLUMN.QUANTITY].firstChild.value * mediviadb.items[item_index].weight).toFixed(1) + " oz";
            let newcell = newrow.insertCell();
            newcell.className = "locationth-right";
            newcell.appendChild(newlbl);

            newlbl = document.createElement("label");
            newlbl.innerText = gtos(loottable_body.rows[i].cells[LOOTTB_COLUMN.QUANTITY].firstChild.value * loottable_body.rows[i].cells[LOOTTB_COLUMN.PRICE].firstChild.value);
            newcell = newrow.insertCell();
            newcell.className = "locationth-right";
            newcell.appendChild(newlbl);

            location_tbody.parentElement.style.display = "table";
        }

        // Calculate location totals
        for (let i = 1; i < huntinfo_selllocation.children.length; i++) {
            let curtable = huntinfo_selllocation.children[i];
            let location_totalweight = 0,
                location_totalprice = 0;
            for (let j = 0; j < curtable.tBodies.length; j++) {
                let curbody = curtable.tBodies[j];
                let npc_totalweight = 0,
                    npc_totalprice = 0;
                let k = 1;
                if (i == huntinfo_selllocation.children.length - 1) k = 0;
                for (; k < curbody.rows.length; k++) {
                    npc_totalweight += stof(curbody.rows[k].cells[LOCATIONTB_COLUMN.WEIGHT].firstChild.innerText);
                    npc_totalprice += stog(curbody.rows[k].cells[LOCATIONTB_COLUMN.PRICE].firstChild.innerText);
                }
                // If we are on the last table, "Players", we won't have a tbody
                if (i != huntinfo_selllocation.children.length - 1) {
                    curbody.rows[0].cells[LOCATIONTB_COLUMN.WEIGHT].innerText = npc_totalweight.toFixed(1) + " oz";
                    curbody.rows[0].cells[LOCATIONTB_COLUMN.PRICE].innerText = gtos(npc_totalprice);
                }
                location_totalweight += npc_totalweight;
                location_totalprice += npc_totalprice;
            }
            curtable.tHead.rows[0].cells[LOCATIONTB_COLUMN.WEIGHT].innerText = location_totalweight.toFixed(1) + " oz";
            curtable.tHead.rows[0].cells[LOCATIONTB_COLUMN.PRICE].innerText = gtos(location_totalprice);
        }

        huntinfo_selllocation.style.display = "block";
    } else huntinfo_selllocation.style.display = "none";
}

// ---------------
// Input handling
// ---------------

function select_upper_input(target) {
    let cell_index = target.parentElement.cellIndex;
    let row_index = target.parentElement.parentElement.sectionRowIndex;
    if (target.tagName == "INPUT" &&
        target.parentElement.tagName == "TD" &&
        row_index > 0) {
        target.parentElement.parentElement.parentElement.rows[row_index - 1].cells[cell_index].firstChild.focus();
        // setSelectionRange
        return true;
    }
    return false;
}

function select_lower_input(target) {
    let cell_index = target.parentElement.cellIndex;
    let row_index = target.parentElement.parentElement.sectionRowIndex;
    if (target.tagName == "INPUT" &&
        target.parentElement.tagName == "TD" &&
        row_index < target.parentElement.parentElement.parentElement.rows.length - 1) {
        target.parentElement.parentElement.parentElement.rows[row_index + 1].cells[cell_index].firstChild.focus();
        // setSelectionRange
        return true;
    }
    return false;
}

function onkeydown_global(event) {
    let handled = true;

    switch (event.code) {
        // @Bug: For some reason, shitty web standards don't let us use "setSelectionRange" with number inputs.
        case "PageUp": {
            select_upper_input(event.target);
        } break;

        case "PageDown": {
            select_lower_input(event.target);
        } break;

        case "Escape": {
            if (is_sidebar_open) close_sidebar_menu();
            else handled = false;
        } break;

        default: handled = false;
    }

    // Block keys used with the control modifier
    if (handled || !event.ctrlKey) {
        if (handled) event.preventDefault();
        return;
    }

    handled = true;
    let dig = -1;
    switch (event.code) {
        case "Digit1":  dig = 1;    break;
        case "Digit2":  dig = 2;    break;
        case "Digit3":  dig = 3;    break;
        case "Digit4":  dig = 4;    break;
        case "Digit5":  dig = 5;    break;
        case "Digit6":  dig = 6;    break;
        case "Digit7":  dig = 7;    break;
        case "Digit8":  dig = 8;    break;
        case "Digit9":  dig = 9;    break;

        case "KeyM":
            loottable_show_creature_items();
            break;

        default:
            // keyCode handling for keys without a string id
            switch (event.keyCode) {
                case 192: // Tilde
                    players_add_player();
                    player(players().length - 1).querySelector(".playername").focus();
                    player(players().length - 1).querySelector(".playername").setSelectionRange(0, 100);
                    break;

                default:  handled = false;
            }
    }

    if (dig != -1) {
        players_grid.scrollIntoView(false);
        if (players().length >= dig + 1) {
            player(dig).querySelector(".playername").focus();
            player(dig).querySelector(".playername").setSelectionRange(0, 100);
        }
    }
    if (handled) event.preventDefault();
}

function onkeyup_loottable(event) {
    switch (event.code) {
        case "Enter":
            huntinfo_calculate_loot();
            break;

        case "Escape":
            select_lower_input(event.target);
            loottable_delete_row(event.target.parentElement.parentElement);
            break;
    }
}

function onkeyup_creature_items(event) {
    if (event.code == "Escape")
        loottable_hide_creature_items();
    event.cancelBubble = true;
}
