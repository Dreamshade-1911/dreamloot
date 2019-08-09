// @Hack: We are putting everything inside one giant json file. We should separate them into files so we can dinamically load from the webserver exactly the monsters and items that the user is searching for.
var mediviadb;

var loottable;
var loottable_lastitemid;
var autocomplete_lastsize = 0;

function init() {
    // Since fetch is async, we should only use the db after the init function returns
    fetch("./db.json")
    .then((resp) => resp.json())
    .then(function(data) {
        mediviadb = data;
    });
    loottable_lastitemid = 0;
    loottable = document.getElementById("loottb");
    loottable_add_row();
}

function loottable_add_row() {
    let row_id = "loottb_item" + loottable_lastitemid;
    loottable.getElementsByTagName("tbody")[0].innerHTML += '<tr id="' + row_id + '"><td><input type="text" id="' + row_id + '_itemname" oninput="autocomplete_itemname(\'' + row_id + '_itemname\')"></td><td><input type="text" id="' + row_id + '_itemquantity"></td><td><input type="text" id="' + row_id + '_itemprice"></td></tr>';
    loottable_lastitemid++;
}

function loottable_clear() {
    loottable.getElementsByTagName("tbody")[0].innerHTML = "";
    loottable_lastitemid = 0;
    loottable_add_row();

    var gold_quant = document.getElementById("loottb_gold_itemquantity");
    gold_quant.value = "";
    gold_quant.focus();
}

function autocomplete_itemname(element_id) {
    let caller_element = document.getElementById(element_id);
    if (autocomplete_lastsize >= caller_element.value.length) {
        autocomplete_lastsize = caller_element.value.length;
        return;
    }

    autocomplete_lastsize = caller_element.value.length;
    let callerlen = caller_element.value.length;
    for (let i = 0; i < mediviadb.items.length; i++) {
        if (callerlen > mediviadb.items[i].name.length)
            continue;
        if (caller_element.value.toLowerCase() == mediviadb.items[i].name.substr(0, callerlen).toLowerCase()) {
            caller_element.value = mediviadb.items[i].name;
            caller_element.setSelectionRange(callerlen, mediviadb.items[i].name.length);
            break;
        }
    }
}
