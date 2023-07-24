export type SAXEventName = 'text' | 'processinginstruction' | 'sgmldeclaration' | 'doctype' | 'comment' | 'opentagstart' | 'attribute' | 'opentag' | 'closetag' | 'opencdata' | 'cdata' | 'closecdata' | 'error' | 'end' | 'ready' | 'script' | 'opennamespace' | 'closenamespace';
export type SAXEventCallback = (data: any, eventName: SAXEventName, SAXParser: any) => void;
export type SAXEvents = {
    ontext?: SAXEventCallback;
    onprocessinginstruction?: SAXEventCallback;
    onsgmldeclaration?: SAXEventCallback;
    ondoctype?: SAXEventCallback;
    oncomment?: SAXEventCallback;
    onopentagstart?: SAXEventCallback;
    onattribute?: SAXEventCallback;
    onopentag?: SAXEventCallback;
    onclosetag?: SAXEventCallback;
    onopencdata?: SAXEventCallback;
    oncdata?: SAXEventCallback;
    onclosecdata?: SAXEventCallback;
    onerror?: SAXEventCallback;
    onend?: SAXEventCallback;
    onready?: SAXEventCallback;
    onscript?: SAXEventCallback;
    onopennamespace?: SAXEventCallback;
    onclosenamespace?: SAXEventCallback;
};
export type SAXParserOptions = SAXEvents & {
    strict?: boolean;
    MAX_BUFFER_LENGTH?: number;
    lowercase?: boolean;
    lowercasetags?: boolean;
    noscript?: boolean;
    strictEntities?: boolean;
    xmlns?: any;
    position?: any;
    trim?: any;
    normalize?: any;
};
export declare const ENTITIES: {
    [key: string]: number | string;
};
/**
 * Internal helper class
 */
declare abstract class SAX {
    EVENTS: string[];
    ENTITIES: {
        [key: string]: number | string;
    };
    protected abstract events: SAXEvents;
    protected XML_ENTITIES: {
        [key: string]: string;
    };
    protected S: any;
    protected opt: any;
    protected trackPosition: boolean;
    protected column: number;
    protected line: number;
    protected c: string;
    protected error: any;
    protected q: string;
    protected bufferCheckPosition: any;
    protected closed: boolean;
    protected tags: any[];
    protected looseCase: string;
    protected closedRoot: boolean;
    protected sawRoot: boolean;
    protected strict: boolean;
    protected tag: any;
    protected strictEntities: any;
    protected state: any;
    protected noscript: boolean;
    protected attribList: any[];
    protected ns: any;
    protected position: number;
    private STATE;
    private readonly BUFFERS;
    private CDATA;
    private DOCTYPE;
    private XML_NAMESPACE;
    private XMLNS_NAMESPACE;
    protected rootNS: {};
    private comment;
    private sgmlDecl;
    private textNode;
    private tagName;
    private doctype;
    private procInstName;
    private procInstBody;
    private entity;
    private attribName;
    private attribValue;
    private cdata;
    private script;
    private startTagPosition;
    constructor();
    private static charAt;
    private static isWhitespace;
    private static isQuote;
    private static isAttribEnd;
    private static isMatch;
    private static notMatch;
    private static qname;
    write(chunk: null | object | string): this | SAXParser;
    protected emit(event: string, data?: Error | {}): void;
    protected clearBuffers(): void;
    protected flushBuffers(): void;
    protected end(): SAXParser;
    protected errorFunction(er: string): this;
    private attrib;
    private newTag;
    private parseEntity;
    private beginWhiteSpace;
    private strictFail;
    private textApplyOptions;
    private emitNode;
    private closeText;
    private checkBufferLength;
    private openTag;
    private closeTag;
}
/**
 *
 * @todo Weird inheritance, with some variables initialized in subclass
 */
export declare class SAXParser extends SAX {
    static ENTITIES: {
        [key: string]: string | number;
    };
    opt: Required<SAXParserOptions>;
    events: Required<SAXEvents>;
    constructor(opt?: SAXParserOptions);
    resume(): this;
    close(): this | SAXParser;
    flush(): void;
}
export {};
//# sourceMappingURL=sax.d.ts.map