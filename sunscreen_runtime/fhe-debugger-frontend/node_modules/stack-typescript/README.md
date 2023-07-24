# stack-typescript 
[![Build Status][travis-badge]][travis] [![Coverage Status][coveralls-badge]][coveralls]

Simple Typescript [Stack][wiki] with generics type templating and support for iterator 
and iterable protocols.

This stack uses the [linked-list-typescript][list] as the underlying datastructure.

See Also:
 - [linked-list-typescript][list]
 - [hashlist-typescript][hashlist]
 - [queue-typescript][queue]

## Installation

[npm][]:

```bash
npm install --save stack-typescript
```

[yarn][]:

```bash
yarn add stack-typescript
```

## Building from source

install dev dependencies. There are no production dependencies.

```bash
yarn
npm install
```

build using the options in `tsconfig.json`

```bash
yarn|npm run build
```

run all package tests

```bash
yarn|npm run test
```

see the test coverage report

```bash
yarn|npm run coverage
yarn|npm run coverage:report
```

## Usage

Importing:

```typescript
import { Stack } from 'stack-typescript';
const { Stack } = require('stack-typescript')
```

## API

### Stack<T>(...values: T[])

#### Stack<T>()

Create an empty stack by omitting any arguments during instantiation.

```typescript
let stack = new Stack<number>()
```

#### Stack<T>(...values: T[])

Create a new stack and initialize it with values. Values will be added from top
to bottom. i.e. the first argument will be at the top and the last argument will 
be at the bottom.

Specify the type using the typescript templating to enable type-checking of all
values going into and out of the stack.

```typescript
let items: number[] = [4, 5, 6, 7];
let stack = new Stack<number>(...items);
```

```typescript
let items: string[] = ['one', 'two', 'three', 'four'];
let stack = new Stack<string>(...items);
```

Typescript will check if the values match the type given to the template
when initializing the new stack.

```typescript
let items: = ['one', 'two', 'three', 4];
let stack = new Stack<string>(...items); // arguments are not all strings
```

#### Stack<Foo>(...values: Foo[])

Create a new stack using custom types or classes. All values are retained as references
and not copies so removed values can be compared using strict comparison.

```typescript
class Foo {
  private val:number;
  constructor(val: number) {
    this.val = val;
  }
  get bar(): number { return this.val }
}

let foo1 = new Foo(1);
let foo2 = new Foo(2);
let foo3 = new Foo(3);

let fooStack = new Stack<Foo>(foo1, foo2, foo3)

fooStack.top.bar // => 1
let val = stack.pop()
val // => foo1
```



#### Stack<any>(...values: any[])

Specify `any` to allow the stack to take values of any type.

```typescript
let stack = new Stack<any>(4, 'hello' { hello: 'world' })
stack.size // => 3
stack.top // => 4
```

#### Stack#[Symbol.iterator]

The stack supports both iterator and iterable protocols allowing it to be used
with the `for...of` and `...spread` operators and with deconstruction.

`for...of`:

```typescript
let items: number[] = [4, 5, 6];
let stack = new Stack<number>(...items);

for (let item of stack) {
  console.log(item)
}
//4
//5
//6
```

`...spread`:

```typescript
let items: number[] = [4, 5, 6];
let stack = new Stack<number>(...items);

function manyArgs(...args) {
  for (let i in args) {
    console.log(args[i])
  }
}
manyArgs(...stack);
//4
//5
//6
```

`deconstruction`:

```typescript
let items: number[] = [4, 5, 6, 7];
let stack = new Stack<number>(...items);

let [a, b, c] = stack;
//a => 4
//b => 5
//c => 6
```

#### Stack<T>#top :T

Peek at the top of the stack. This will not remove the value
from the stack.

```typescript
let items: number[] = [4, 5, 6, 7];
let stack = new Stack<number>(...items);
stack.top // => 4
```

#### Stack<T>#size :number

Query the size of the stack. An empty stack will return 0.

```typescript
let items: number[] = [4, 5, 6, 7];
let stack = new Stack<number>(...items);
stack.size // => 4
```

#### Stack<T>#push(val: T): boolean

Push an item to the top of the stack. The new item will replace the previous top item
and subsequent calls to [Stack<T>#top](#lstacktop-t) will now recall the new item.

```typescript
let items: number[] = [4, 5, 6, 7];
let stack = new Stack<number>(...items);
stack.size // => 4
stack.push(8)
stack.size // => 5
```

#### Stack<T>#pop(): T

Removes the item at the top of the stack and returns the item.

```typescript
let items: number[] = [4, 5, 6, 7];
let stack = new Stack<number>(...items);
stack.size // => 4
let val = stack.pop()
stack.size // => 3
stack.top // => 5
val // => 4
```

#### Stack<T>#toArray(): T[]

This method simply returns `[...this]`.

Converts the stack into an array and returns the array representation. This method does
not mutate the stack in any way.

Objects are not copied, so all non-primitive items in the array are still referencing
the stack items.

```typescript
let items: number[] = [4, 5, 6, 7];
let stack = new Stack<number>(...items);
let result = stack.toArray()
result // => [4, 5, 6, 7]
```

## License

[MIT][license] © [Michael Sutherland][author]

<!-- Definitions -->

[travis-badge]: https://img.shields.io/travis/sfkiwi/stack-typescript.svg

[travis]: https://travis-ci.org/sfkiwi/stack-typescript

[coveralls-badge]: https://img.shields.io/coveralls/github/sfkiwi/stack-typescript.svg

[coveralls]: https://coveralls.io/github/sfkiwi/stack-typescript

[npm]: https://docs.npmjs.com/cli/install

[yarn]: https://yarnpkg.com/lang/en/docs/install/

[license]: LICENSE.md

[author]: http://github.com/sfkiwi

[wiki]: https://simple.wikipedia.org/wiki/Stack_(data_structure)

[list]: https://www.npmjs.com/package/linked-list-typescript

[stack]: https://www.npmjs.com/package/stack-typescript

[queue]: https://www.npmjs.com/package/queue-typescript

[hashlist]: https://www.npmjs.com/package/hashlist-typescript
