import {ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, EventEmitter, forwardRef, HostListener, Input, OnInit, Output, ViewChild} from '@angular/core';
import {ControlValueAccessor, NG_VALUE_ACCESSOR} from '@angular/forms';
import {IDropdownSettings, ListItem} from "./model/multi-select-dropdown.model";
import {Subject} from "rxjs/Subject";
import {debounceTime, distinctUntilChanged} from "rxjs/operators";

export const DROPDOWN_CONTROL_VALUE_ACCESSOR: any = {
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => MultiSelectDropdownComponent),
    multi: true
};
const noop = () => {
};

@Component({
    selector: 'pvu-multi-select-dropdown',
    templateUrl: './multi-select-dropdown.component.html',
    styleUrls: ['./multi-select-dropdown.component.scss'],
    providers: [DROPDOWN_CONTROL_VALUE_ACCESSOR],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class MultiSelectDropdownComponent implements ControlValueAccessor, OnInit {
    public selectedItems: Array<ListItem> = [];
    public isDropdownOpen = true;
    @ViewChild('txtInput') txtInput: ElementRef;
    filter: ListItem = new ListItem(this.data);
    defaultSettings: IDropdownSettings = {
        singleSelection: true,
        idField: 'id',
        textField: 'text',
        enableCheckAll: true,
        selectAllText: 'Select All',
        unSelectAllText: 'UnSelect All',
        allowSearchFilter: false,
        limitSelection: -1,
        clearSearchFilter: true,
        maxHeight: 197,
        itemsShowLimit: 2,
        searchPlaceholderText: 'Search',
        noDataAvailablePlaceholderText: 'No data available',
        closeDropDownOnSelection: false,
        showSelectedItemsAtTop: false,
        defaultOpen: false,
        customClass: 'multi-select-xs',
        customField: 'customData'
    };
    @Input() disabled = false;
    @Output() onFilterChange: EventEmitter<ListItem> = new EventEmitter<any>();
    @Output() onDropDownClose: EventEmitter<ListItem> = new EventEmitter<any>();
    @Output() onSelect: EventEmitter<ListItem> = new EventEmitter<any>();
    @Output() onDeSelect: EventEmitter<ListItem> = new EventEmitter<any>();
    @Output() onSelectAll: EventEmitter<Array<ListItem>> = new EventEmitter<Array<any>>();
    @Output() onDeSelectAll: EventEmitter<Array<ListItem>> = new EventEmitter<Array<any>>();
    @Input() getDynamicPlaceHolder:(settings:IDropdownSettings, selectedItems:Array<ListItem>)=> string | string;
    private inputUpdated: Subject<any> = new Subject<ListItem>();
    private onTouchedCallback: () => void = noop;
    private onChangeCallback: (_: any) => void = noop;

    constructor(private cdr: ChangeDetectorRef) {
    }

    private _settings: IDropdownSettings;
    private _data: Array<ListItem> = [];

    @Input()
    public set settings(value: IDropdownSettings) {
        if (value) {
            this._settings = Object.assign(this.defaultSettings, value);
        } else {
            this._settings = Object.assign(this.defaultSettings);
        }
    }


    public get settings(): IDropdownSettings {
        return this._settings;
    }



    @Input()
    public set data(value: Array<any>) {
        if (!value) {
            this._data = [];
        } else {
            this._data = value.map(
                (item: any) =>
                    typeof item === 'string'
                        ? new ListItem(item)
                        : new ListItem({
                            id: item[this.settings.idField],
                            text: item[this.settings.textField],
                            customData: item[this.settings.customField]
                        })
            );
        }
    }

    public get data():Array<any> {
        return this._data;
    }

    @Input()
    public set defaultSelected(value:Array<any>) {
        if(value) this.setData(value);
    }

    ngOnInit() {
        this.inputUpdated.pipe(debounceTime(200), distinctUntilChanged()).subscribe(searchKey => {
            let searchValue = searchKey.trim();
            this.onFilterChange.emit(searchValue);
        });
    }

    onFilterTextChange($event) {
        this.inputUpdated.next($event);
    }

    onItemClick($event: any, item: ListItem) {
        if (this.disabled) {
            return false;
        }

        const found = this.isSelected(item);
        const allowAdd =
            this.settings.limitSelection === -1 ||
            (this.settings.limitSelection > 0 &&
                this.selectedItems.length < this.settings.limitSelection);
        if (!found) {
            if (allowAdd) {
                this.addSelected(item);
            }
        } else {
            this.removeSelected(item);
        }
        if (
            this.settings.singleSelection &&
            this.settings.closeDropDownOnSelection
        ) {
            this.closeDropdown();
        }

        this.filter.text = '';
    }

    writeValue(value: any) {
        this.setData(value);
    }

    setData(value: any) {
        if (value !== undefined && value !== null && value.length > 0) {
            if (this.settings.singleSelection) {
                try {
                    if (value.length >= 1) {
                        const firstItem = value[0];
                        this.selectedItems = [
                            typeof firstItem === 'string'
                                ? new ListItem(firstItem)
                                : new ListItem({
                                    id: firstItem[this.settings.idField],
                                    text: firstItem[this.settings.textField],
                                    customData: firstItem[this.settings.customField]
                                })
                        ];
                    }
                } catch (e) {
                    // console.error(e.body.msg);
                }
            } else {
                const data = value.map(
                    (item: any) =>
                        typeof item === 'string'
                            ? new ListItem(item)
                            : new ListItem({
                                id: item[this.settings.idField],
                                text: item[this.settings.textField],
                                customData: item[this.settings.customField]
                            })
                );
                if (this.settings.limitSelection > 0) {
                    this.selectedItems = data.splice(0, this.settings.limitSelection);
                } else {
                    this.selectedItems = data;
                }
            }
        } else {
            this.selectedItems = [];
        }
        this.onChangeCallback(value);
    }

    // From ControlValueAccessor interface
    registerOnChange(fn: any) {
        this.onChangeCallback = fn;
    }

    // From ControlValueAccessor interface
    registerOnTouched(fn: any) {
        this.onTouchedCallback = fn;
    }

    // Set touched on blur
    @HostListener('blur')
    public onTouched() {
        this.closeDropdown();
        this.onTouchedCallback();
    }

    trackByFn(index, item) {
        return item.id;
    }

    isSelected(clickedItem: ListItem) {
        let found = false;
        this.selectedItems.forEach(item => {
            if (clickedItem.id === item.id) {
                found = true;
            }
        });
        return found;
    }

    isLimitSelectionReached(): boolean {
        return this.settings.limitSelection === this.selectedItems.length;
    }

    isAllItemsSelected(): boolean {
        return this.data.length === this.selectedItems.length;
    }

    showButton(): boolean {
        if (!this.settings.singleSelection) {
            if (this.settings.limitSelection > 0) {
                return false;
            }
            // this.settings.enableCheckAll = this.settings.limitSelection === -1 ? true : false;
            return true; // !this.settings.singleSelection && this.settings.enableCheckAll && this.data.length > 0;
        } else {
            // should be disabled in single selection mode
            return false;
        }
    }

    itemShowRemaining(): number {
        return this.selectedItems.length - this.settings.itemsShowLimit;
    }

    addSelected(item: ListItem) {
        if (this.settings.singleSelection) {
            this.selectedItems = [];
            this.selectedItems.push(item);
        } else {
            this.selectedItems.push(item);
        }
        this.onChangeCallback(this.emittedValue(this.selectedItems));
        this.onSelect.emit(this.emittedValue(item));
    }

    removeSelected(itemSel: ListItem) {
        this.selectedItems.forEach(item => {
            if (itemSel.id === item.id) {
                this.selectedItems.splice(this.selectedItems.indexOf(item), 1);
            }
        });
        this.onChangeCallback(this.emittedValue(this.selectedItems));
        this.onDeSelect.emit(this.emittedValue(itemSel));
    }

    emittedValue(val: any): any {
        const selected = [];
        if (Array.isArray(val)) {
            val.map(item => {
                if (item.id === item.text) {
                    selected.push(item.text);
                } else {
                    selected.push(this.objectify(item));
                }
            });
        } else {
            if (val) {
                if (val.id === val.text) {
                    return val.text;
                } else {
                    return this.objectify(val);
                }
            }
        }
        return selected;
    }

    objectify(val: ListItem) {
        const obj = {};
        obj[this.settings.idField] = val.id;
        obj[this.settings.textField] = val.text;
        obj[this.settings.customField] = val.customData;
        return obj;
    }

    toggleDropdown(evt) {
        evt.preventDefault();
        if (this.disabled) {
            return;
        }
        if(this.txtInput && this.txtInput.nativeElement) this.txtInput.nativeElement.focus();
        this.settings.defaultOpen = !this.settings.defaultOpen;
        if (!this.settings.defaultOpen) {
            this.onDropDownClose.emit();
        }
    }

    closeDropdown() {
        this.settings.defaultOpen = false;
        // clear search text
        if (this.settings.clearSearchFilter) {
            this.filter.text = '';
        }
        this.onDropDownClose.emit();
    }

    toggleSelectAll() {
        if (this.disabled) {
            return false;
        }
        if (!this.isAllItemsSelected()) {
            this.selectedItems = this.data.slice();
            this.onSelectAll.emit(this.emittedValue(this.selectedItems));
        } else {
            this.selectedItems = [];
            this.onDeSelectAll.emit(this.emittedValue(this.selectedItems));
        }
        this.onChangeCallback(this.emittedValue(this.selectedItems));
    }

    onSearch(searchValue: string) {
        this.settings.defaultOpen = true;
        this.inputUpdated.next(searchValue);
    }

    get selectedListItems() {
        return this.selectedItems;
    }

    getPlaceHolder(settings: IDropdownSettings, selectedItems: Array<ListItem>) {
        return this.getDynamicPlaceHolder ? this.getDynamicPlaceHolder(settings, selectedItems) : settings.searchPlaceholderText;
    }
}

