"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const weekday_1 = require("./weekday");
const dateutil_1 = require("./dateutil");
const iterinfo_1 = require("./iterinfo");
const helpers_1 = require("./helpers");
const iterresult_1 = require("./iterresult");
const callbackiterresult_1 = require("./callbackiterresult");
const getnlp = function () {
    // Lazy, runtime import to avoid circular refs.
    if (!getnlp._nlp) {
        getnlp._nlp = require('./nlp');
    }
    return getnlp._nlp;
};
var Frequency;
(function (Frequency) {
    Frequency[Frequency["YEARLY"] = 0] = "YEARLY";
    Frequency[Frequency["MONTHLY"] = 1] = "MONTHLY";
    Frequency[Frequency["WEEKLY"] = 2] = "WEEKLY";
    Frequency[Frequency["DAILY"] = 3] = "DAILY";
    Frequency[Frequency["HOURLY"] = 4] = "HOURLY";
    Frequency[Frequency["MINUTELY"] = 5] = "MINUTELY";
    Frequency[Frequency["SECONDLY"] = 6] = "SECONDLY";
})(Frequency = exports.Frequency || (exports.Frequency = {}));
const Days = {
    MO: new weekday_1.default(0),
    TU: new weekday_1.default(1),
    WE: new weekday_1.default(2),
    TH: new weekday_1.default(3),
    FR: new weekday_1.default(4),
    SA: new weekday_1.default(5),
    SU: new weekday_1.default(6)
};
/**
 *
 * @param {Options?} options - see <http://labix.org/python-dateutil/#head-cf004ee9a75592797e076752b2a889c10f445418>
 *        The only required option is `freq`, one of RRule.YEARLY, RRule.MONTHLY, ...
 * @constructor
 */
class RRule {
    constructor(options = {}, noCache = false) {
        this.defaultKeys = Object.keys(RRule.DEFAULT_OPTIONS);
        // RFC string
        this._string = null;
        this._cache = noCache
            ? null
            : {
                all: false,
                before: [],
                after: [],
                between: []
            };
        // used by toString()
        this.origOptions = this.initializeOptions(options);
        this.options = this.parseOptions(options);
    }
    initializeOptions(options) {
        const invalid = [];
        const keys = Object.keys(options);
        const initializedOptions = {};
        // Shallow copy for options and origOptions and check for invalid
        keys.forEach(key => {
            initializedOptions[key] = options[key];
            if (!helpers_1.contains(this.defaultKeys, key))
                invalid.push(key);
        });
        if (invalid.length) {
            throw new Error('Invalid options: ' + invalid.join(', '));
        }
        return initializedOptions;
    }
    parseOptions(options) {
        const opts = this.initializeOptions(options);
        const keys = Object.keys(options);
        if (!RRule.FREQUENCIES[options.freq] && options.byeaster === null) {
            throw new Error('Invalid frequency: ' + String(options.freq));
        }
        // Merge in default options
        this.defaultKeys.forEach(key => {
            if (!helpers_1.contains(keys, key))
                opts[key] = RRule.DEFAULT_OPTIONS[key];
        });
        if (opts.byeaster !== null)
            opts.freq = RRule.YEARLY;
        if (!opts.dtstart)
            opts.dtstart = new Date(new Date().setMilliseconds(0));
        const millisecondModulo = opts.dtstart.getTime() % 1000;
        if (opts.wkst === null) {
            opts.wkst = RRule.MO.weekday;
        }
        else if (typeof opts.wkst === 'number') {
            // cool, just keep it like that
        }
        else {
            opts.wkst = opts.wkst.weekday;
        }
        if (opts.bysetpos !== null) {
            if (typeof opts.bysetpos === 'number')
                opts.bysetpos = [opts.bysetpos];
            for (let i = 0; i < opts.bysetpos.length; i++) {
                const v = opts.bysetpos[i];
                if (v === 0 || !(v >= -366 && v <= 366)) {
                    throw new Error('bysetpos must be between 1 and 366,' + ' or between -366 and -1');
                }
            }
        }
        if (!(Boolean(opts.byweekno) ||
            helpers_1.notEmpty(opts.byweekno) ||
            helpers_1.notEmpty(opts.byyearday) ||
            Boolean(opts.bymonthday) ||
            helpers_1.notEmpty(opts.bymonthday) ||
            opts.byweekday !== null ||
            opts.byeaster !== null)) {
            switch (opts.freq) {
                case RRule.YEARLY:
                    if (!opts.bymonth)
                        opts.bymonth = opts.dtstart.getMonth() + 1;
                    opts.bymonthday = opts.dtstart.getDate();
                    break;
                case RRule.MONTHLY:
                    opts.bymonthday = opts.dtstart.getDate();
                    break;
                case RRule.WEEKLY:
                    opts.byweekday = [dateutil_1.default.getWeekday(opts.dtstart)];
                    break;
            }
        }
        // bymonth
        if (opts.bymonth !== null && !(opts.bymonth instanceof Array)) {
            opts.bymonth = [opts.bymonth];
        }
        // byyearday
        if (opts.byyearday !== null && !(opts.byyearday instanceof Array)) {
            opts.byyearday = [opts.byyearday];
        }
        // bymonthday
        if (opts.bymonthday === null) {
            opts.bymonthday = [];
            opts.bynmonthday = [];
        }
        else if (opts.bymonthday instanceof Array) {
            const bymonthday = [];
            const bynmonthday = [];
            for (let i = 0; i < opts.bymonthday.length; i++) {
                const v = opts.bymonthday[i];
                if (v > 0) {
                    bymonthday.push(v);
                }
                else if (v < 0) {
                    bynmonthday.push(v);
                }
            }
            opts.bymonthday = bymonthday;
            opts.bynmonthday = bynmonthday;
        }
        else {
            if (opts.bymonthday < 0) {
                opts.bynmonthday = [opts.bymonthday];
                opts.bymonthday = [];
            }
            else {
                opts.bynmonthday = [];
                opts.bymonthday = [opts.bymonthday];
            }
        }
        // byweekno
        if (opts.byweekno !== null && !(opts.byweekno instanceof Array)) {
            opts.byweekno = [opts.byweekno];
        }
        // byweekday / bynweekday
        if (opts.byweekday === null) {
            opts.bynweekday = null;
        }
        else if (typeof opts.byweekday === 'number') {
            opts.byweekday = [opts.byweekday];
            opts.bynweekday = null;
        }
        else if (opts.byweekday instanceof weekday_1.default) {
            if (!opts.byweekday.n || opts.freq > RRule.MONTHLY) {
                opts.byweekday = [opts.byweekday.weekday];
                opts.bynweekday = null;
            }
            else {
                opts.bynweekday = [[opts.byweekday.weekday, opts.byweekday.n]];
                opts.byweekday = null;
            }
        }
        else {
            const byweekday = [];
            const bynweekday = [];
            for (let i = 0; i < opts.byweekday.length; i++) {
                const wday = opts.byweekday[i];
                if (typeof wday === 'number') {
                    byweekday.push(wday);
                    continue;
                }
                const wd = wday;
                if (!wd.n || opts.freq > RRule.MONTHLY) {
                    byweekday.push(wd.weekday);
                }
                else {
                    bynweekday.push([wd.weekday, wd.n]);
                }
            }
            opts.byweekday = helpers_1.notEmpty(byweekday) ? byweekday : null;
            opts.bynweekday = helpers_1.notEmpty(bynweekday) ? bynweekday : null;
        }
        // byhour
        if (opts.byhour === null) {
            opts.byhour = opts.freq < RRule.HOURLY ? [opts.dtstart.getHours()] : null;
        }
        else if (typeof opts.byhour === 'number') {
            opts.byhour = [opts.byhour];
        }
        // byminute
        if (opts.byminute === null) {
            opts.byminute =
                opts.freq < RRule.MINUTELY ? [opts.dtstart.getMinutes()] : null;
        }
        else if (typeof opts.byminute === 'number') {
            opts.byminute = [opts.byminute];
        }
        // bysecond
        if (opts.bysecond === null) {
            opts.bysecond =
                opts.freq < RRule.SECONDLY ? [opts.dtstart.getSeconds()] : null;
        }
        else if (typeof opts.bysecond === 'number') {
            opts.bysecond = [opts.bysecond];
        }
        if (opts.freq >= RRule.HOURLY) {
            this.timeset = null;
        }
        else {
            this.timeset = [];
            for (let i = 0; i < opts.byhour.length; i++) {
                const hour = opts.byhour[i];
                for (let j = 0; j < opts.byminute.length; j++) {
                    const minute = opts.byminute[j];
                    for (let k = 0; k < opts.bysecond.length; k++) {
                        const second = opts.bysecond[k];
                        // python:
                        // datetime.time(hour, minute, second,
                        // tzinfo=self._tzinfo))
                        this.timeset.push(new dateutil_1.default.Time(hour, minute, second, millisecondModulo));
                    }
                }
            }
            dateutil_1.default.sort(this.timeset);
        }
        return opts;
    }
    static parseText(text, language) {
        return getnlp().parseText(text, language);
    }
    static fromText(text, language) {
        return getnlp().fromText(text, language);
    }
    static parseString(rfcString) {
        rfcString = rfcString.replace(/^\s+|\s+$/, '');
        if (!rfcString.length)
            return null;
        const attrs = rfcString.split(';');
        const options = {};
        for (let i = 0; i < attrs.length; i++) {
            const attr = attrs[i].split('=');
            const key = attr[0];
            const value = attr[1];
            switch (key) {
                case 'FREQ':
                    options.freq = Frequency[value];
                    break;
                case 'WKST':
                    options.wkst = Days[value];
                    break;
                case 'COUNT':
                case 'INTERVAL':
                case 'BYSETPOS':
                case 'BYMONTH':
                case 'BYMONTHDAY':
                case 'BYYEARDAY':
                case 'BYWEEKNO':
                case 'BYHOUR':
                case 'BYMINUTE':
                case 'BYSECOND':
                    let num;
                    if (value.indexOf(',') !== -1) {
                        const values = value.split(',');
                        num = values.map(val => {
                            if (/^[+-]?\d+$/.test(val.toString())) {
                                return Number(val);
                            }
                            else {
                                return val;
                            }
                        });
                    }
                    else if (/^[+-]?\d+$/.test(value)) {
                        num = Number(value);
                    }
                    else {
                        num = value;
                    }
                    const optionKey = key.toLowerCase();
                    // @ts-ignore
                    options[optionKey] = num;
                    break;
                case 'BYDAY': // => byweekday
                    let n;
                    let wday;
                    let day;
                    const days = value.split(',');
                    options.byweekday = [];
                    for (let j = 0; j < days.length; j++) {
                        day = days[j];
                        if (day.length === 2) {
                            // MO, TU, ...
                            wday = Days[day]; // wday instanceof Weekday
                            options.byweekday.push(wday);
                        }
                        else {
                            // -1MO, +3FR, 1SO, ...
                            const parts = day.match(/^([+-]?\d)([A-Z]{2})$/);
                            n = Number(parts[1]);
                            const wdaypart = parts[2];
                            wday = Days[wdaypart].weekday;
                            options.byweekday.push(new weekday_1.default(wday, n));
                        }
                    }
                    break;
                case 'DTSTART':
                    options.dtstart = dateutil_1.default.untilStringToDate(value);
                    break;
                case 'UNTIL':
                    options.until = dateutil_1.default.untilStringToDate(value);
                    break;
                case 'BYEASTER':
                    options.byeaster = Number(value);
                    break;
                default:
                    throw new Error("Unknown RRULE property '" + key + "'");
            }
        }
        return options;
    }
    static fromString(str) {
        return new RRule(RRule.parseString(str));
    }
    static optionsToString(options) {
        const pairs = [];
        const keys = Object.keys(options);
        const defaultKeys = Object.keys(RRule.DEFAULT_OPTIONS);
        for (let i = 0; i < keys.length; i++) {
            if (!helpers_1.contains(defaultKeys, keys[i]))
                continue;
            let key = keys[i].toUpperCase();
            let value = options[keys[i]];
            let strValues = [];
            if (value === null || (value instanceof Array && !value.length))
                continue;
            switch (key) {
                case 'FREQ':
                    value = RRule.FREQUENCIES[options.freq];
                    break;
                case 'WKST':
                    if (!(value instanceof weekday_1.default)) {
                        value = new weekday_1.default(value);
                    }
                    break;
                case 'BYWEEKDAY':
                    /*
                    NOTE: BYWEEKDAY is a special case.
                    RRule() deconstructs the rule.options.byweekday array
                    into an array of Weekday arguments.
                    On the other hand, rule.origOptions is an array of Weekdays.
                    We need to handle both cases here.
                    It might be worth change RRule to keep the Weekdays.
          
                    Also, BYWEEKDAY (used by RRule) vs. BYDAY (RFC)
          
                    */
                    key = 'BYDAY';
                    if (!(value instanceof Array))
                        value = [value];
                    for (let j = 0; j < value.length; j++) {
                        let wday = value[j];
                        if (wday instanceof weekday_1.default) {
                            // good
                        }
                        else if (wday instanceof Array) {
                            wday = new weekday_1.default(wday[0], wday[1]);
                        }
                        else {
                            wday = new weekday_1.default(wday);
                        }
                        strValues[j] = wday.toString();
                    }
                    value = strValues;
                    break;
                case 'DTSTART':
                case 'UNTIL':
                    value = dateutil_1.default.timeToUntilString(value);
                    break;
                default:
                    if (value instanceof Array) {
                        for (let j = 0; j < value.length; j++) {
                            strValues[j] = String(value[j]);
                        }
                        value = strValues;
                    }
                    else {
                        value = String(value);
                    }
            }
            pairs.push([key, value]);
        }
        const strings = [];
        for (let i = 0; i < pairs.length; i++) {
            const attr = pairs[i];
            strings.push(attr[0] + '=' + attr[1].toString());
        }
        return strings.join(';');
    }
    /**
     * @param {Function} iterator - optional function that will be called
     *                   on each date that is added. It can return false
     *                   to stop the iteration.
     * @return Array containing all recurrences.
     */
    all(iterator) {
        if (iterator) {
            return this._iter(new callbackiterresult_1.default('all', {}, iterator));
        }
        else {
            let result = this._cacheGet('all');
            if (result === false) {
                result = this._iter(new iterresult_1.default('all', {}));
                this._cacheAdd('all', result);
            }
            return result;
        }
    }
    /**
     * Returns all the occurrences of the rrule between after and before.
     * The inc keyword defines what happens if after and/or before are
     * themselves occurrences. With inc == True, they will be included in the
     * list, if they are found in the recurrence set.
     * @return Array
     */
    between(after, before, inc = false, iterator) {
        const args = {
            before,
            after,
            inc
        };
        if (iterator) {
            return this._iter(new callbackiterresult_1.default('between', args, iterator));
        }
        let result = this._cacheGet('between', args);
        if (result === false) {
            result = this._iter(new iterresult_1.default('between', args));
            this._cacheAdd('between', result, args);
        }
        return result;
    }
    /**
     * Returns the last recurrence before the given datetime instance.
     * The inc keyword defines what happens if dt is an occurrence.
     * With inc == True, if dt itself is an occurrence, it will be returned.
     * @return Date or null
     */
    before(dt, inc = false) {
        const args = { dt: dt, inc: inc };
        let result = this._cacheGet('before', args);
        if (result === false) {
            result = this._iter(new iterresult_1.default('before', args));
            this._cacheAdd('before', result, args);
        }
        return result;
    }
    /**
     * Returns the first recurrence after the given datetime instance.
     * The inc keyword defines what happens if dt is an occurrence.
     * With inc == True, if dt itself is an occurrence, it will be returned.
     * @return Date or null
     */
    after(dt, inc = false) {
        const args = { dt: dt, inc: inc };
        let result = this._cacheGet('after', args);
        if (result === false) {
            result = this._iter(new iterresult_1.default('after', args));
            this._cacheAdd('after', result, args);
        }
        return result;
    }
    /**
     * Returns the number of recurrences in this set. It will have go trough
     * the whole recurrence, if this hasn't been done before.
     */
    count() {
        return this.all().length;
    }
    /**
     * Converts the rrule into its string representation
     * @see <http://www.ietf.org/rfc/rfc2445.txt>
     * @return String
     */
    toString() {
        return RRule.optionsToString(this.origOptions);
    }
    /**
     * Will convert all rules described in nlp:ToText
     * to text.
     */
    toText(gettext, language) {
        return getnlp().toText(this, gettext, language);
    }
    isFullyConvertibleToText() {
        return getnlp().isFullyConvertible(this);
    }
    /**
     * @param {String} what - all/before/after/between
     * @param {Array,Date} value - an array of dates, one date, or null
     * @param {Object?} args - _iter arguments
     */
    _cacheAdd(what, value, args) {
        if (!this._cache)
            return;
        if (value) {
            value =
                value instanceof Date
                    ? dateutil_1.default.clone(value)
                    : dateutil_1.default.cloneDates(value);
        }
        if (what === 'all') {
            this._cache.all = value;
        }
        else {
            args._value = value;
            this._cache[what].push(args);
        }
    }
    /**
     * @return false - not in the cache
     *         null  - cached, but zero occurrences (before/after)
     *         Date  - cached (before/after)
     *         []    - cached, but zero occurrences (all/between)
     *         [Date1, DateN] - cached (all/between)
     */
    _cacheGet(what, args) {
        if (!this._cache)
            return false;
        let cached = false;
        const argsKeys = args ? Object.keys(args) : [];
        const findCacheDiff = function (item) {
            for (let i = 0; i < argsKeys.length; i++) {
                const key = argsKeys[i];
                if (String(args[key]) !== String(item[key])) {
                    return true;
                }
            }
            return false;
        };
        const cachedObject = this._cache[what];
        if (what === 'all') {
            cached = this._cache.all;
        }
        else if (cachedObject instanceof Array) {
            // Let's see whether we've already called the
            // 'what' method with the same 'args'
            for (let i = 0; i < cachedObject.length; i++) {
                const item = cachedObject[i];
                if (argsKeys.length && findCacheDiff(item))
                    continue;
                cached = item._value;
                break;
            }
        }
        if (!cached && this._cache.all) {
            // Not in the cache, but we already know all the occurrences,
            // so we can find the correct dates from the cached ones.
            const iterResult = new iterresult_1.default(what, args);
            for (let i = 0; i < this._cache.all.length; i++) {
                if (!iterResult.accept(this._cache.all[i]))
                    break;
            }
            cached = iterResult.getValue();
            this._cacheAdd(what, cached, args);
        }
        return cached instanceof Array
            ? dateutil_1.default.cloneDates(cached)
            : cached instanceof Date
                ? dateutil_1.default.clone(cached)
                : cached;
    }
    /**
     * @return a RRule instance with the same freq and options
     *          as this one (cache is not cloned)
     */
    clone() {
        return new RRule(this.origOptions);
    }
    _iter(iterResult) {
        /* Since JavaScript doesn't have the python's yield operator (<1.7),
            we use the IterResult object that tells us when to stop iterating.
    
        */
        const dtstart = this.options.dtstart;
        const dtstartMillisecondModulo = this.options.dtstart.valueOf() % 1000;
        let year = dtstart.getFullYear();
        let month = dtstart.getMonth() + 1;
        let day = dtstart.getDate();
        let hour = dtstart.getHours();
        let minute = dtstart.getMinutes();
        let second = dtstart.getSeconds();
        let weekday = dateutil_1.default.getWeekday(dtstart);
        // Some local variables to speed things up a bit
        const { freq, interval, wkst, until, bymonth, byweekno, byyearday, byweekday, byeaster, bymonthday, bynmonthday, bysetpos, byhour, byminute, bysecond } = this.options;
        const ii = new iterinfo_1.default(this);
        ii.rebuild(year, month);
        const getdayset = {
            [RRule.YEARLY]: ii.ydayset,
            [RRule.MONTHLY]: ii.mdayset,
            [RRule.WEEKLY]: ii.wdayset,
            [RRule.DAILY]: ii.ddayset,
            [RRule.HOURLY]: ii.ddayset,
            [RRule.MINUTELY]: ii.ddayset,
            [RRule.SECONDLY]: ii.ddayset
        }[freq];
        let timeset;
        let gettimeset;
        if (freq < RRule.HOURLY) {
            timeset = this.timeset;
        }
        else {
            gettimeset = {
                [RRule.YEARLY]: ii.ydayset,
                [RRule.MONTHLY]: ii.mdayset,
                [RRule.WEEKLY]: ii.wdayset,
                [RRule.DAILY]: ii.ddayset,
                [RRule.HOURLY]: ii.htimeset,
                [RRule.MINUTELY]: ii.mtimeset,
                [RRule.SECONDLY]: ii.stimeset
            }[freq];
            if ((freq >= RRule.HOURLY && helpers_1.notEmpty(byhour) && !helpers_1.contains(byhour, hour)) ||
                (freq >= RRule.MINUTELY &&
                    helpers_1.notEmpty(byminute) &&
                    !helpers_1.contains(byminute, minute)) ||
                (freq >= RRule.SECONDLY && helpers_1.notEmpty(bysecond) && !helpers_1.contains(bysecond, second))) {
                timeset = [];
            }
            else {
                timeset = gettimeset.call(ii, hour, minute, second, dtstartMillisecondModulo);
            }
        }
        let currentDay;
        let total = 0;
        let count = this.options.count;
        let dm;
        let div;
        let mod;
        let pos;
        while (true) {
            // Get dayset with the right frequency
            const [dayset, start, end] = getdayset.call(ii, year, month, day);
            // Do the "hard" work ;-)
            let filtered = false;
            for (let dayCounter = start; dayCounter < end; dayCounter++) {
                currentDay = dayset[dayCounter];
                filtered =
                    (helpers_1.notEmpty(bymonth) && !helpers_1.contains(bymonth, ii.mmask[currentDay])) ||
                        (helpers_1.notEmpty(byweekno) && !ii.wnomask[currentDay]) ||
                        (helpers_1.notEmpty(byweekday) &&
                            !helpers_1.contains(byweekday, ii.wdaymask[currentDay])) ||
                        (helpers_1.notEmpty(ii.nwdaymask) && !ii.nwdaymask[currentDay]) ||
                        (byeaster !== null && !helpers_1.contains(ii.eastermask, currentDay)) ||
                        ((helpers_1.notEmpty(bymonthday) || helpers_1.notEmpty(bynmonthday)) &&
                            !helpers_1.contains(bymonthday, ii.mdaymask[currentDay]) &&
                            !helpers_1.contains(bynmonthday, ii.nmdaymask[currentDay])) ||
                        (helpers_1.notEmpty(byyearday) &&
                            ((currentDay < ii.yearlen &&
                                !helpers_1.contains(byyearday, currentDay + 1) &&
                                !helpers_1.contains(byyearday, -ii.yearlen + currentDay)) ||
                                (currentDay >= ii.yearlen &&
                                    !helpers_1.contains(byyearday, currentDay + 1 - ii.yearlen) &&
                                    !helpers_1.contains(byyearday, -ii.nextyearlen + currentDay - ii.yearlen))));
                if (filtered)
                    dayset[currentDay] = null;
            }
            // Output results
            if (helpers_1.notEmpty(bysetpos) && helpers_1.notEmpty(timeset)) {
                let daypos;
                let timepos;
                const poslist = [];
                for (let j = 0; j < (bysetpos).length; j++) {
                    pos = bysetpos[j];
                    if (pos < 0) {
                        daypos = Math.floor(pos / timeset.length);
                        timepos = helpers_1.pymod(pos, timeset.length);
                    }
                    else {
                        daypos = Math.floor((pos - 1) / timeset.length);
                        timepos = helpers_1.pymod(pos - 1, timeset.length);
                    }
                    try {
                        const tmp = [];
                        for (let k = start; k < end; k++) {
                            const val = dayset[k];
                            if (val === null)
                                continue;
                            tmp.push(val);
                        }
                        let i;
                        if (daypos < 0) {
                            // we're trying to emulate python's aList[-n]
                            i = tmp.slice(daypos)[0];
                        }
                        else {
                            i = tmp[daypos];
                        }
                        const time = timeset[timepos];
                        const date = dateutil_1.default.fromOrdinal(ii.yearordinal + i);
                        const res = dateutil_1.default.combine(date, time);
                        // XXX: can this ever be in the array?
                        // - compare the actual date instead?
                        if (!helpers_1.contains(poslist, res))
                            poslist.push(res);
                        // tslint:disable-next-line:no-empty
                    }
                    catch (e) { }
                }
                dateutil_1.default.sort(poslist);
                for (let j = 0; j < poslist.length; j++) {
                    const res = poslist[j];
                    if (until && res > until) {
                        this._len = total;
                        return iterResult.getValue();
                    }
                    else if (res >= dtstart) {
                        ++total;
                        if (!iterResult.accept(res)) {
                            return iterResult.getValue();
                        }
                        if (count) {
                            --count;
                            if (!count) {
                                this._len = total;
                                return iterResult.getValue();
                            }
                        }
                    }
                }
            }
            else {
                for (let j = start; j < end; j++) {
                    currentDay = dayset[j];
                    if (currentDay !== null) {
                        const date = dateutil_1.default.fromOrdinal(ii.yearordinal + currentDay);
                        for (let k = 0; k < timeset.length; k++) {
                            const time = timeset[k];
                            const res = dateutil_1.default.combine(date, time);
                            if (until && res > until) {
                                this._len = total;
                                return iterResult.getValue();
                            }
                            else if (res >= dtstart) {
                                ++total;
                                if (!iterResult.accept(res)) {
                                    return iterResult.getValue();
                                }
                                if (count) {
                                    --count;
                                    if (!count) {
                                        this._len = total;
                                        return iterResult.getValue();
                                    }
                                }
                            }
                        }
                    }
                }
            }
            // Handle frequency and interval
            let fixday = false;
            if (freq === RRule.YEARLY) {
                year += interval;
                if (year > dateutil_1.default.MAXYEAR) {
                    this._len = total;
                    return iterResult.getValue();
                }
                ii.rebuild(year, month);
            }
            else if (freq === RRule.MONTHLY) {
                month += interval;
                if (month > 12) {
                    div = Math.floor(month / 12);
                    mod = helpers_1.pymod(month, 12);
                    month = mod;
                    year += div;
                    if (month === 0) {
                        month = 12;
                        --year;
                    }
                    if (year > dateutil_1.default.MAXYEAR) {
                        this._len = total;
                        return iterResult.getValue();
                    }
                }
                ii.rebuild(year, month);
            }
            else if (freq === RRule.WEEKLY) {
                if (wkst > weekday) {
                    day += -(weekday + 1 + (6 - wkst)) + interval * 7;
                }
                else {
                    day += -(weekday - wkst) + interval * 7;
                }
                weekday = wkst;
                fixday = true;
            }
            else if (freq === RRule.DAILY) {
                day += interval;
                fixday = true;
            }
            else if (freq === RRule.HOURLY) {
                if (filtered) {
                    // Jump to one iteration before next day
                    hour += Math.floor((23 - hour) / interval) * interval;
                }
                while (true) {
                    hour += interval;
                    dm = helpers_1.divmod(hour, 24);
                    div = dm.div;
                    mod = dm.mod;
                    if (div) {
                        hour = mod;
                        day += div;
                        fixday = true;
                    }
                    if (!helpers_1.notEmpty(byhour) || helpers_1.contains(byhour, hour))
                        break;
                }
                timeset = gettimeset.call(ii, hour, minute, second);
            }
            else if (freq === RRule.MINUTELY) {
                if (filtered) {
                    // Jump to one iteration before next day
                    minute +=
                        Math.floor((1439 - (hour * 60 + minute)) / interval) * interval;
                }
                while (true) {
                    minute += interval;
                    dm = helpers_1.divmod(minute, 60);
                    div = dm.div;
                    mod = dm.mod;
                    if (div) {
                        minute = mod;
                        hour += div;
                        dm = helpers_1.divmod(hour, 24);
                        div = dm.div;
                        mod = dm.mod;
                        if (div) {
                            hour = mod;
                            day += div;
                            fixday = true;
                            filtered = false;
                        }
                    }
                    if ((!helpers_1.notEmpty(byhour) || helpers_1.contains(byhour, hour)) &&
                        (!helpers_1.notEmpty(byminute) || helpers_1.contains(byminute, minute))) {
                        break;
                    }
                }
                timeset = gettimeset.call(ii, hour, minute, second);
            }
            else if (freq === RRule.SECONDLY) {
                if (filtered) {
                    // Jump to one iteration before next day
                    second +=
                        Math.floor((86399 - (hour * 3600 + minute * 60 + second)) / interval) * interval;
                }
                while (true) {
                    second += interval;
                    dm = helpers_1.divmod(second, 60);
                    div = dm.div;
                    mod = dm.mod;
                    if (div) {
                        second = mod;
                        minute += div;
                        dm = helpers_1.divmod(minute, 60);
                        div = dm.div;
                        mod = dm.mod;
                        if (div) {
                            minute = mod;
                            hour += div;
                            dm = helpers_1.divmod(hour, 24);
                            div = dm.div;
                            mod = dm.mod;
                            if (div) {
                                hour = mod;
                                day += div;
                                fixday = true;
                            }
                        }
                    }
                    if ((!helpers_1.notEmpty(byhour) || helpers_1.contains(byhour, hour)) &&
                        (!helpers_1.notEmpty(byminute) || helpers_1.contains(byminute, minute)) &&
                        (!helpers_1.notEmpty(bysecond) || helpers_1.contains(bysecond, second))) {
                        break;
                    }
                }
                timeset = gettimeset.call(ii, hour, minute, second);
            }
            if (fixday && day > 28) {
                let daysinmonth = dateutil_1.default.monthRange(year, month - 1)[1];
                if (day > daysinmonth) {
                    while (day > daysinmonth) {
                        day -= daysinmonth;
                        ++month;
                        if (month === 13) {
                            month = 1;
                            ++year;
                            if (year > dateutil_1.default.MAXYEAR) {
                                this._len = total;
                                return iterResult.getValue();
                            }
                        }
                        daysinmonth = dateutil_1.default.monthRange(year, month - 1)[1];
                    }
                    ii.rebuild(year, month);
                }
            }
        }
    }
}
// RRule class 'constants'
RRule.FREQUENCIES = [
    'YEARLY',
    'MONTHLY',
    'WEEKLY',
    'DAILY',
    'HOURLY',
    'MINUTELY',
    'SECONDLY'
];
RRule.YEARLY = Frequency.YEARLY;
RRule.MONTHLY = Frequency.MONTHLY;
RRule.WEEKLY = Frequency.WEEKLY;
RRule.DAILY = Frequency.DAILY;
RRule.HOURLY = Frequency.HOURLY;
RRule.MINUTELY = Frequency.MINUTELY;
RRule.SECONDLY = Frequency.SECONDLY;
RRule.DEFAULT_OPTIONS = {
    freq: null,
    dtstart: null,
    interval: 1,
    wkst: Days.MO,
    count: null,
    until: null,
    bysetpos: null,
    bymonth: null,
    bymonthday: null,
    bynmonthday: null,
    byyearday: null,
    byweekno: null,
    byweekday: null,
    bynweekday: null,
    byhour: null,
    byminute: null,
    bysecond: null,
    byeaster: null
};
RRule.MO = Days.MO;
RRule.TU = Days.TU;
RRule.WE = Days.WE;
RRule.TH = Days.TH;
RRule.FR = Days.FR;
RRule.SA = Days.SA;
RRule.SU = Days.SU;
exports.default = RRule;
//# sourceMappingURL=rrule.js.map