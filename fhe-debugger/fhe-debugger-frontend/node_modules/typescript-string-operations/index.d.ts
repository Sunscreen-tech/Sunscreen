export declare const emptyString = "";
export declare function isNullOrWhiteSpace(value: string | null): boolean;
export declare function joinString(delimiter: string, ...args: (string | object | Array<any>)[]): string;
export declare function formatString(format: string, ...args: any[]): string;
export declare class String {
    private static readonly regexNumber;
    private static readonly regexObject;
    static empty: string;
    /**
     * @deprecated The property should not be used, and will be removed in future versions! Use `String.empty` instead.
    */
    static Empty: string;
    /**
     * @deprecated The method should not be used, and will be removed in future versions! Use `String.isNullOrWhiteSpace()` instead.
    */
    static IsNullOrWhiteSpace(value: string | null | undefined): boolean;
    /**
     * @deprecated The method should not be used, and will be removed in future versions! Use `String.join()` instead.
    */
    static Join(delimiter: string, ...args: (string | object | Array<any>)[]): string;
    /**
     * @deprecated The method should not be used, and will be removed in future version!s Use `String.format()` instead.
    */
    static Format(format: string, ...args: any[]): string;
    static isNullOrWhiteSpace(value: string | null): boolean;
    static join(delimiter: string, ...args: (string | object | Array<any>)[]): string;
    static format(format: string, ...args: any[]): string;
    private static formatString;
    private static parsePattern;
    private static decimalToHexString;
    private static getDisplayDateFromString;
    private static getSortableDateFromString;
    private static formatNumber;
    private static joinString;
}
export declare class StringBuilder {
    Values: string[];
    constructor(value?: string);
    toString(): string;
    /**
     * @deprecated The method should not be used, and will be removed in future versions! Use `toString()` instead.
    */
    ToString(): string;
    append(value: string): void;
    /**
     * @deprecated The method should not be used, and will be removed in future versions! Use `append()` instead.
    */
    Append(value: string): void;
    appendLine(value: string): void;
    /**
     * @deprecated The method should not be used, and will be removed in future versions! Use `appendLine()` instead.
    */
    AppendLine(value: string): void;
    appendFormat(format: string, ...args: any[]): void;
    /**
     * @deprecated The method should not be used, and will be removed in future versions! Use `appendFormat()` instead.
    */
    AppendFormat(format: string, ...args: any[]): void;
    appendLineFormat(format: string, ...args: any[]): void;
    /**
     * @deprecated The method should not be used, and will be removed in future versions! Use `appendLineFormat()` instead.
    */
    AppendLineFormat(format: string, ...args: any[]): void;
    clear(): void;
    /**
     * @deprecated The method should not be used, and will be removed in future versions! Use `clear()` instead.
    */
    Clear(): void;
}
