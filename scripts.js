var mediviadb;

// Constants
var LOOTTB_COLUMN = {
    NAME: 0,
    QUANTITY: 1,
    PRICE: 2,
    DELETE: 3
};

// HTML Elements
var loottable;
var huntinfo;
var loottable_body;
var loottb_addcreatureitems_panel;
var loottb_addcreature_name;

var loottable_autocomplete_lastsize = 0;
var creature_items_autocomplete_lastindex = -1;

function init() {
    // Since fetch is async, we should only use the db after the init function returns
    fetch("./db.json")
    .then((resp) => resp.json())
    .then(function(data) {
        mediviadb = data;
    });
    loottable = document.getElementById("loottb");
    loottable_body = loottable.getElementsByTagName("tbody")[0];
    loottable_add_row();

    loottb_addcreatureitems_panel = document.getElementById("loottb_addcreatureitems");
    loottb_addcreature_name = document.getElementById("loottb_creaturename");
    huntinfo = document.getElementById("huntinfo");
}

function stog(str) {
    if (str == "") return 0;
    else return parseInt(str);
}

function gtos(amount) {
    if (amount < 1000) return amount + " gp";
    else return (amount / 1000) + " K";
    //else if (amount >= 1000 && amount < 1000000) return (amount / 1000) + " K";
    //else return (amount / 1000000) + " KK";
}

// --------------------------------------
// Functions pertaining to the loottable
// --------------------------------------

// @Robustness: It would be way better to make a function that recalculates the
// last and first items that gets called whenever we delete or add an item. The
// current implementation of trying to keep track of them when adding/removing
// is convoluted, has code duplication and is error-prone.
function loottable_add_row() {
    let row_index = loottable_body.rows.length;
    let row = loottable_body.insertRow();

    let itemname = document.createElement("input");
    itemname.type = "text";
    itemname.setAttribute("oninput", "autocomplete_itemname('" + row_index + "')");
    row.insertCell().appendChild(itemname);

    itemname.setAttribute("onfocusout", "loottable_check_add_row('" + row_index  + "')");
    if (row_index > 0)
        loottable_body.rows[row_index - 1].cells[LOOTTB_COLUMN.NAME].firstChild.removeAttribute("onfocusin");

    let itemquantity = document.createElement("input");
    itemquantity.type = "text";
    row.insertCell().appendChild(itemquantity);

    let itemprice = document.createElement("input");
    itemprice.type = "text";
    row.insertCell().appendChild(itemprice);

    if (row_index > 0) {
        let deletebutton = document.createElement("button");
        deletebutton.setAttribute("class", "delete_row_button");
        deletebutton.setAttribute("onclick", "loottable_delete_row('" + row_index + "')");
        deletebutton.innerText = "X";
        deletebutton.tabIndex = -1;
        row.insertCell().appendChild(deletebutton);
    }
    return row;
}

function loottable_check_add_row(callerrow_index) {
    if (callerrow_index != loottable_body.rows.length - 1) return;
    if (loottable_body.rows[callerrow_index].cells[LOOTTB_COLUMN.NAME].firstChild.value != "")
        loottable_add_row();
}

// @Improvement: We can keep track of the selected row index so we can select the same index or the previous one if that doesn't exist.
function loottable_delete_row(callerrow_index) {
    loottable_body.deleteRow(callerrow_index);
    
    if (callerrow_index == loottable_body.rows.length - 1) {
        loottable_body.rows[callerrow_index - 1].cells[LOOTTB_COLUMN.NAME].firstChild.setAttribute("onfocusout", "loottable_check_add_row('" + (callerrow_index - 1)  + "')");
    } else {
        // We have to forcefully update the indexes of items below the one we
        // deleted, otherwise the functions won't work correctly.
        for (let i = callerrow_index; i < loottable_body.rows.length; i++)
            loottable_body.rows[i].cells[LOOTTB_COLUMN.DELETE].firstChild.setAttribute("onclick", "loottable_delete_row('" + i + "')");
    }
}

function loottable_clear() {
    loottable_body.innerHTML = "";
    loottable_add_row();

    let gold_quant = document.getElementById("loottb_gold_itemquantity");
    gold_quant.value = "";
    gold_quant.focus();
}

function autocomplete_itemname(callerrow_index) {
    let callerrow_itemname = loottable_body.rows[callerrow_index].cells[LOOTTB_COLUMN.NAME].firstChild;
    let callerrow_itemprice = loottable_body.rows[callerrow_index].cells[LOOTTB_COLUMN.PRICE].firstChild;

    suggestion_index = autocomplete_generic(mediviadb.items, callerrow_itemname);
    if (suggestion_index == -1)
        callerrow_itemprice.value = "";
    else
        callerrow_itemprice.value = mediviadb.items[suggestion_index].price;
}

// @Speed: We can keep track of the last used db index so that we start to search for a suggestion at that index instead of index 0 (since the db is ordered alphabetically anyways), and clear it once the user backspaces, which should be the first if block.
// Takes an array of objects with a 'name' field to be searched and returns the index that was found, or -1 on failure.
function autocomplete_generic(item_array, input_field) {
    if (loottable_autocomplete_lastsize >= input_field.value.length) {
        loottable_autocomplete_lastsize = input_field.value.length;
        return -1;
    }

    loottable_autocomplete_lastsize = input_field.value.length;
    let inputlen = input_field.value.length;
    let suggestion_index = -1;
    for (let i = 0; i < item_array.length; i++) {
        if (inputlen > item_array[i].name.length)
            continue;
        if (input_field.value.toLowerCase() == item_array[i].name.substr(0, inputlen).toLowerCase()) {
            input_field.value = item_array[i].name;
            input_field.setSelectionRange(inputlen, item_array[i].name.length);
            suggestion_index = i;
            break;
        }
    }
    return suggestion_index;
}

function autocomplete_creature_items() {
    let creaturename_field = document.getElementById("loottb_creaturename");
    creature_items_autocomplete_lastindex = autocomplete_generic(mediviadb.creatures, creaturename_field);
}

function loottable_show_creature_items() {
    loottb_addcreatureitems_panel.style.display = "grid";
    loottb_addcreature_name.focus();
}

function loottable_hide_creature_items() {
    loottb_addcreature_name.value = "";
    loottb_addcreatureitems_panel.style.display = "none";
}

function loottable_add_creature_items() {
    let i = 0;
    let index = creature_items_autocomplete_lastindex;
    let creature_name_input = document.getElementById("loottb_creaturename");

    if (index == -1) {
        for (index = 0; index < mediviadb.creatures.length; index++) {
            if (mediviadb.creatures[index].name == creature_name_input.value) {
                break;
            }
            else {
                // @Improvement: We should display an error message to the user saying that the creature name doesn't exist.
                if (index == mediviadb.creatures.length - 1) return;
            }
        }
    }
    let creature = mediviadb.creatures[index];

    let first_row = loottable_body.rows[loottable_body.rows.length - 1];
    if (first_row.cells[LOOTTB_COLUMN.NAME].firstChild.value == "") {
        first_row.cells[LOOTTB_COLUMN.NAME].firstChild.value = creature.items[0];
        autocomplete_itemname(first_row.sectionRowIndex);
        i = 1;
    }
    for (; i < creature.items.length; i++) {
        loottable_autocomplete_lastsize = 0;
        let row = loottable_add_row();
        row.cells[LOOTTB_COLUMN.NAME].firstChild.value = creature.items[i];
        autocomplete_itemname(row.sectionRowIndex);
    }
    loottable_add_row();
    document.getElementById("loottb_creaturename").focus();
}

// ----------------------------------
// Functions pertaining to hunt info
// ----------------------------------

function huntinfo_calculate_loot() {
    let totalearnings = 0;

    totalearnings += stog(document.getElementById("loottb_gold_itemquantity").value);
    let cur_rowid;
    for (let i = 0; i < loottable_body.rows.length - 1; i++) {
        cur_row = loottable_body.rows[i];
        totalearnings += stog(cur_row.cells[LOOTTB_COLUMN.PRICE].firstChild.value * stog(cur_row.cells[LOOTTB_COLUMN.QUANTITY].firstChild.value));
    }

    document.getElementById("huntinfo_totalearnings").innerText = gtos(totalearnings);
    document.getElementById("huntinfo_profit").innerText = gtos(totalearnings);
    document.getElementById("huntinfo_splitprofit").innerText = gtos(totalearnings);
}
