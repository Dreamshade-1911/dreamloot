// @Hack: We are putting everything inside one giant json file. We should separate them into files so we can dinamically load from the webserver exactly the monsters and items that the user is searching for.
var mediviadb;

var loottable;
var loottable_body;
var loottable_lastitemid = 0;
var loottable_autocomplete_lastsize = 0;

var huntinfo;

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

    huntinfo = document.getElementById("huntinfo");
}

function stog(str) {
    if (str == "") return 0;
    else return parseInt(str);
}

function gtos(amount) {
    if (amount < 1000) return amount;
    else return (amount / 1000) + " K";
    //else if (amount >= 1000 && amount < 1000000) return (amount / 1000) + " K";
    //else return (amount / 1000000) + " KK";
}

// -------------------------------------
// Functions pertaining to the loottable
// -------------------------------------

function loottable_add_row() {
    let row_id = "loottb_item" + loottable_lastitemid;

    let row = loottable_body.insertRow();
    row.id = row_id;
    row.setAttribute("onfocusin", "loottable_check_add_row('" + row_id + "')");

    let itemname = document.createElement("input");
    itemname.type = "text";
    itemname.id = row_id + "_itemname";
    itemname.setAttribute("oninput", "autocomplete_itemname('" + row_id + "')");
    row.insertCell().appendChild(itemname);

    let itemquantity = document.createElement("input");
    itemquantity.type = "text";
    itemquantity.id = row_id + "_itemquantity";
    row.insertCell().appendChild(itemquantity);

    let itemprice = document.createElement("input");
    itemprice.type = "text";
    itemprice.id = row_id + "_itemprice";
    row.insertCell().appendChild(itemprice);

    let deletebutton = document.createElement("button");
    deletebutton.setAttribute("class", "delete_row_button");
    deletebutton.setAttribute("onclick", "loottable_delete_row('" + row_id + "')");
    deletebutton.innerText = "X";
    deletebutton.tabIndex = -1;
    row.insertCell().appendChild(deletebutton);

    loottable_lastitemid++;
}

// @Improvement: We can keep track of the selected row index so we can select the same index or the previous one if that doesn't exist.
function loottable_delete_row(callerrow_id) {
    loottable.deleteRow(loottable.rows.namedItem(callerrow_id).rowIndex);
    if (loottable.rows.length == 2) loottable_add_row();
}

function loottable_check_add_row(callerrow_id) {
    if (loottable.rows[loottable.rows.length - 1] == loottable.rows.namedItem(callerrow_id))
        loottable_add_row();
}

function loottable_clear() {
    loottable_body.innerHTML = "";
    loottable_lastitemid = 0;
    loottable_add_row();

    let gold_quant = document.getElementById("loottb_gold_itemquantity");
    gold_quant.value = "";
    gold_quant.focus();
}

// @Improvement: We can split this function in two so we can have a generic autocomplete.
// @Speed: We can keep track of the last used db index for a specific autocomplete so that we start to search for a suggestion at that index instead of index 0 (since the db is ordered alphabetically anyways), and clear it once the user backspaces, which should be the first if block.
function autocomplete_itemname(callerrow_id) {
    let callerrow_itemname = document.getElementById(callerrow_id + "_itemname");
    let callerrow_itemprice = document.getElementById(callerrow_id + "_itemprice");
    if (loottable_autocomplete_lastsize >= callerrow_itemname.value.length) {
        loottable_autocomplete_lastsize = callerrow_itemname.value.length;
        NoSuggestion();
        return;
    }

    loottable_autocomplete_lastsize = callerrow_itemname.value.length;
    let inputlen = callerrow_itemname.value.length;
    let found_suggestion = false;
    for (let i = 0; i < mediviadb.items.length; i++) {
        if (inputlen > mediviadb.items[i].name.length)
            continue;
        if (callerrow_itemname.value.toLowerCase() == mediviadb.items[i].name.substr(0, inputlen).toLowerCase()) {
            callerrow_itemname.value = mediviadb.items[i].name;
            callerrow_itemname.setSelectionRange(inputlen, mediviadb.items[i].name.length);
            callerrow_itemprice.value = mediviadb.items[i].price;
            found_suggestion = true;
            break;
        }
    }
    if (!found_suggestion) NoSuggestion();

    function NoSuggestion() {
        callerrow_itemprice.value = "";
    }
}

function loottable_add_creature_items() {
    
}


function huntinfo_calculate_loot() {
    let totalearnings = 0;

    totalearnings += stog(document.getElementById("loottb_gold_itemquantity").value);
    let cur_rowid;
    for (let i = 0; i < loottable_body.rows.length - 1; i++) {
        cur_rowid = loottable_body.rows[i].id;
        totalearnings += stog(document.getElementById(cur_rowid + "_itemprice").value) * stog(document.getElementById(cur_rowid + "_itemquantity").value);
    }

    document.getElementById("huntinfo_totalearnings").innerText = gtos(totalearnings);
    document.getElementById("huntinfo_profit").innerText = gtos(totalearnings);
    document.getElementById("huntinfo_splitprofit").innerText = gtos(totalearnings);
}
