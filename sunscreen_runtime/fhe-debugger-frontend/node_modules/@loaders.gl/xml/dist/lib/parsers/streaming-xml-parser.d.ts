import { SAXParser, SAXParserOptions } from '../../sax-ts/sax';
export type StreamingXMLParserOptions = SAXParserOptions;
/**
 * StreamingXMLParser builds a JSON object using the events emitted by the SAX parser
 */
export declare class StreamingXMLParser {
    readonly parser: SAXParser;
    result: undefined;
    previousStates: never[];
    currentState: Readonly<{
        container: never[];
        key: null;
    }>;
    constructor(options: SAXParserOptions);
    reset(): void;
    write(chunk: any): void;
    close(): void;
    _pushOrSet(value: any): void;
    _openArray(newContainer?: never[]): void;
    _closeArray(): void;
    _openObject(newContainer?: {}): void;
    _closeObject(): void;
}
//# sourceMappingURL=streaming-xml-parser.d.ts.map