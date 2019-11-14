// Constants
var PLAYERS_PANEL = {
    HEADER: 0,
    RUNESTABLE: 2
};

var PLAYERSTB_COLUMN = {
    NAME: 0,
    QUANTITY: 1,
    PRICE: 2
}

var LOOTTB_COLUMN = {
    NAME: 0,
    QUANTITY: 1,
    PRICE: 2,
    DELETE: 3
};

var LOCATIONTB_COLUMN = {
    NAME: 0,
    WEIGHT: 1,
    PRICE: 2
};

// @Speed: For every access into an array item we can cache the index of the lookup.
// For example: Amulet of Loss having a second sellto that corresponds to the npc indexes,
// and the npcs having another location which refers to the location index.
var mediviadb;

// Templates
var playerpanel_template;
var locationtable_template;
var npctbody_template;

// HTML Elements
var players_grid;
var loottable;
var loottable_body;
var addcreature_panel;
var addcreature_name;
var huntinfo;
var huntinfo_totalwaste;
var huntinfo_totalearnings;
var huntinfo_profit;
var huntinfo_splitprofit;
var huntinfo_playerstable;
var huntinfo_selllocation;

var autocomplete_lastsize = 0;
var addcreature_autocomplete_lastindex = -1;

function init() {
    // Fetch is async
    fetch("./db.json")
    .then((resp) => resp.json())
    .then(function(data) {
        mediviadb = data;
        players_add_player();
        loottable_add_row();
        huntinfo_create_location_rows();
        player(1).querySelector(".playername").focus();
        player(1).querySelector(".playername").setSelectionRange(0, 100);
    });

    playerpanel_template = document.getElementById("playerpanel-template");
    locationtable_template = document.getElementById("locationtable-template");
    npctbody_template = document.getElementById("npctbody-template");

    players_grid = document.getElementById("playersgrid");

    loottable = document.getElementById("loottb");
    loottable_body = loottable.getElementsByTagName("tbody")[0];

    addcreature_panel = document.getElementById("loottb_addcreatureitems");
    addcreature_name = document.getElementById("loottb_creaturename");
    
    huntinfo = document.getElementById("huntinfo");
    huntinfo_totalwaste = document.getElementById("huntinfo_totalwaste");
    huntinfo_totalearnings = document.getElementById("huntinfo_totalearnings");
    huntinfo_profit = document.getElementById("huntinfo_profit");
    huntinfo_splitprofit = document.getElementById("huntinfo_splitprofit");
    huntinfo_playerstable = document.getElementById("huntinfo_playerstb");
    huntinfo_selllocation = document.getElementById("huntinfo_selllocation");

    document.body.addEventListener("keydown", onkeydown_global);
}

function stoi(str) {
    if (str == "") return 0;
    else return parseInt(str);
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
    if (Math.abs(amount) < 1000) return parseInt(amount) + " GP";
    else if (Math.abs(amount) >= 1000 && Math.abs(amount) < 1000000) return (amount / 1000).toFixed(1) + " K";
    else return (Math.abs(amount) / 1000000).toFixed(3) + " KK";
}

// @Speed: We can keep track of the last used db index so that we start to search for a suggestion at that index instead of index 0 (since the db is ordered alphabetically anyways), and clear it once the user backspaces, which should be the first if block.
// Takes an array of objects with a 'name' field to be searched and returns the index that was found, or -1 on failure.
function autocomplete_generic(item_array, input_field) {
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
            input_field.value = item_array[i].name;
            input_field.setSelectionRange(inputlen, item_array[i].name.length);
            suggestion_index = i;
            break;
        }
    }
    return suggestion_index;
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
            rowprice.value = dbarray[i].price;
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
    if (row_index > 0) {
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

    suggestion_index = autocomplete_generic(mediviadb.items, callerrow_itemname);
    if (suggestion_index == -1) callerrow_itemprice.value = "";
    else callerrow_itemprice.value = mediviadb.items[suggestion_index].price;
    callerrow.setAttribute("data-itemindex", suggestion_index);
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
        cur_quant = loottable_body.rows[i].cells[LOOTTB_COLUMN.QUANTITY].firstChild;
        if (cur_quant.value == "") {
            cur_quant.scrollIntoView(false);
            cur_quant.focus();
            break;
        }
    }
}

function loottable_add_creature_items() {
    // @Improvement: We should display an error message to the user saying that the creature name doesn't exist.
    if (addcreature_autocomplete_lastindex == -1) return;
    let i = 0;
    let creature = mediviadb.creatures[addcreature_autocomplete_lastindex];

    // @Improvement: Instead of only checking the last row, keep adding items on empty rows until we reach the last one
    let first_row = loottable_body.rows[loottable_body.rows.length - 1];
    if (first_row.cells[LOOTTB_COLUMN.NAME].firstChild.value == "") {
        first_row.cells[LOOTTB_COLUMN.NAME].firstChild.value = creature.items[0];
        autocomplete_itemname(first_row);
        i = 1;
    }

    let loottb_length = loottable_body.rows.length;
    let skip_item;
    for (; i < creature.items.length; i++) {
        // If the item already exists in the table, skip it
        skip_item = false;
        for (let j = 0; j < loottb_length; j++) {
            if (creature.items[i] == loottable_body.rows[j].cells[LOOTTB_COLUMN.NAME].firstChild.value) {
                skip_item = true;
                break;
            }
        }
        if (skip_item) continue;

        autocomplete_lastsize = 0;
        let row = loottable_add_row();
        row.cells[LOOTTB_COLUMN.NAME].firstChild.value = creature.items[i];
        autocomplete_itemname(row);
    }

    loottable_add_row();
    addcreature_panel.scrollIntoView();
    addcreature_name.value = "";
    autocomplete_creature_items();
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

function huntinfo_calculate_loot() {
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
    for (let i = 0; i < loottable_body.rows.length - 1; i++) {
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
                                location_tbody.rows[0].cells[LOCATIONTB_COLUMN.NAME].innerText = mediviadb.npcs[npc_index].name;
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
            let newlbl = document.createElement("label");
            newlbl.innerText = loottable_body.rows[i].cells[LOOTTB_COLUMN.NAME].firstChild.value;
            newrow.insertCell().appendChild(newlbl);

            newlbl = document.createElement("label");
            if (item_index == -1) newlbl.innerText = "0 oz";
            else newlbl.innerText = loottable_body.rows[i].cells[LOOTTB_COLUMN.QUANTITY].firstChild.value * mediviadb.items[item_index].weight + " oz";
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
                    npc_totalweight += stoi(curbody.rows[k].cells[LOCATIONTB_COLUMN.WEIGHT].firstChild.innerText);
                    npc_totalprice += stog(curbody.rows[k].cells[LOCATIONTB_COLUMN.PRICE].firstChild.innerText);
                }
                // If we are on the last table, "Players", we won't have a tbody
                if (i != huntinfo_selllocation.children.length - 1) {
                    curbody.rows[0].cells[LOCATIONTB_COLUMN.WEIGHT].innerText = npc_totalweight + " oz";
                    curbody.rows[0].cells[LOCATIONTB_COLUMN.PRICE].innerText = gtos(npc_totalprice);
                }
                location_totalweight += npc_totalweight;
                location_totalprice += npc_totalprice;
            }
            curtable.tHead.rows[0].cells[LOCATIONTB_COLUMN.WEIGHT].innerText = location_totalweight + " oz";
            curtable.tHead.rows[0].cells[LOCATIONTB_COLUMN.PRICE].innerText = gtos(location_totalprice);
        }

        huntinfo_selllocation.style.display = "block";
    } else huntinfo_selllocation.style.display = "none";
}

// ---------------
// Input handling
// ---------------

function onkeydown_global(event) {
    let handled = true;

    let cell_index, row_index;
    switch (event.code) {
        // @Bug: For some reason, shitty web standards don't let us use "setSelectionRange" with number inputs.
        case "PageUp":
            cell_index = event.target.parentElement.cellIndex;
            row_index = event.target.parentElement.parentElement.sectionRowIndex;
            if (event.target.tagName == "INPUT" &&
                event.target.parentElement.tagName == "TD" &&
                row_index > 0) {
                event.target.parentElement.parentElement.parentElement.rows[row_index - 1].cells[cell_index].firstChild.focus();
                // setSelectionRange
            }
            break;

        case "PageDown":
            cell_index = event.target.parentElement.cellIndex;
            row_index = event.target.parentElement.parentElement.sectionRowIndex;
            if (event.target.tagName == "INPUT" &&
                event.target.parentElement.tagName == "TD" &&
                row_index < event.target.parentElement.parentElement.parentElement.rows.length - 1) {
                event.target.parentElement.parentElement.parentElement.rows[row_index + 1].cells[cell_index].firstChild.focus();
                // setSelectionRange
            }
            break;

        default: handled = false;
    }

    // Block keys used with the control modifier
    if (handled || !event.ctrlKey) {
        if (handled) event.preventDefault;
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

// @@Make pageup and pagedown change rows
function onkeyup_loottable(event) {
    switch (event.code) {
        case "Enter":
            huntinfo_calculate_loot();
            break;

        case "Escape":
            loottable_clear();
            break;
    }
}

function onkeyup_creature_items(event) {
    if (event.code == "Escape")
        loottable_hide_creature_items();
    event.cancelBubble = true;
}
