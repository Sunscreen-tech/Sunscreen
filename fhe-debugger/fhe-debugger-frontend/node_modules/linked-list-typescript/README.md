# linked-list-typescript 
[![Build Status][travis-badge]][travis] [![Coverage Status][coveralls-badge]][coveralls]

Simple Typescript [Linked List][wiki] with generics type templating and support for iterator 
and iterable protocols.

See Also:
 - [hashlist-typescript][hashlist]
 - [stack-typescript][stack]
 - [queue-typescript][queue]

## Installation

[npm][]:

```bash
npm install --save linked-list-typescript
```

[yarn][]:

```bash
yarn add linked-list-typescript
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
import { LinkedList } from 'linked-list-typescript';
const { LinkedList } = require('linked-list-typescript')
```

## API

### LinkedList<T>(...values: T[])

#### LinkedList<T>()

Create an empty linked list by omitting any arguments during instantiation.

```typescript
let list = new LinkedList<number>()
```

#### LinkedList<T>(...values: T[])

Create a new list and initialize it with values. Values will be appended from left
to right. i.e. the first argument will be at the head and the last argument will 
be at the tail.

Specify the type using the typescript templating to enable type-checking of all
values going into and out of the list.

```typescript
let items: number[] = [4, 5, 6, 7];
let list = new LinkedList<number>(...items);
```

```typescript
let items: string[] = ['one', 'two', 'three', 'four'];
let list = new LinkedList<string>(...items);
```

Typescript will check if the values match the type given to the template
when initializing the new list.

```typescript
let items: = ['one', 'two', 'three', 4];
let list = new LinkedList<string>(...items); // arguments are not all strings
```

#### LinkedList<Foo>(...values: Foo[])

Create a new list using custom types or classes. All values are retained as references
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

let fooList = new LinkedList<Foo>(foo1, foo2, foo3)

fooList.head.bar // => 1
fooList.tail.bar // => 3
let val = list.removeHead()
val // => foo1
```



#### LinkedList<any>(...values: any[])

Specify `any` to allow the list to take values of any type.

```typescript
let list = new LinkedList<any>(4, 'hello' { hello: 'world' })
list.length // => 3
list.head // => 4
list.tail // => { hello: 'world' }
```

#### LinkedList#[Symbol.iterator]

The list supports both iterator and iterable protocols allowing it to be used
with the `for...of` and `...spread` operators and with deconstruction.

`for...of`:

```typescript
let items: number[] = [4, 5, 6];
let list = new LinkedList<number>(...items);

for (let item of list) {
  console.log(item)
}
//4
//5
//6
```

`...spread`:

```typescript
let items: number[] = [4, 5, 6];
let list = new LinkedList<number>(...items);

function manyArgs(...args) {
  for (let i in args) {
    console.log(args[i])
  }
}
manyArgs(...list);
//4
//5
//6
```

`deconstruction`:

```typescript
let items: number[] = [4, 5, 6, 7];
let list = new LinkedList<number>(...items);

let [a, b, c] = list;
//a => 4
//b => 5
//c => 6
```

#### LinkedList<T>#head :T

Peek at the value at the head of the list. This will not remove the value
from the list.

```typescript
let items: number[] = [4, 5, 6, 7];
let list = new LinkedList<number>(...items);
list.head // => 4
```

#### LinkedList<T>#tail :T

Peek at the value at the tail of the list. This will not remove the value
from the list.

```typescript
let items: number[] = [4, 5, 6, 7];
let list = new LinkedList<number>(...items);
list.tail // => 7
```

#### LinkedList<T>#length :number

Query the length of the list. An empty list will return 0.

```typescript
let items: number[] = [4, 5, 6, 7];
let list = new LinkedList<number>(...items);
list.length // => 4
```

#### LinkedList<T>#append(val: T, checkDuplicates: boolean = false): boolean

Append an item to the end of the list. The new item will replace the previous tail item
and subsequent calls to [LinkedList<T>#head](#linkedlistthead-t) will now recall the new item.

```typescript
let items: number[] = [4, 5, 6, 7];
let list = new LinkedList<number>(...items);
list.length // => 4
list.append(8)
list.length // => 5
list.tail // => 8
```

The optional argument `checkDuplicates` is `false` by default. If set to `true`, it will
check if the new value is already contained in the list. If the value is found to be a
duplicate it will not be added and the method will return `false`.

Values are checked using strict `===` comparison. Checking for duplicates inserts the list
into a [`Set`][set] and then checks if the value is contained in the set.

```typescript
let items: number[] = [4, 5, 6, 7];
let list = new LinkedList<number>(...items);
list.length // => 4
let result = list.append(5, true)
list.length // => 4
list.tail // => 7
results // => false
```

#### LinkedList<T>#prepend(val: T, checkDuplicates: boolean = false): boolean

Prepend an item to the beginning of the list. The new item will replace the previous head item
and subsequent calls to `LinkedList<T>#head` will now recall the new item.

```typescript
let items: number[] = [4, 5, 6, 7];
let list = new LinkedList<number>(...items);
list.length // => 4
list.prepend(3)
list.length // => 5
list.head // => 3
```

The optional argument `checkDuplicates` is `false` by default. If set to `true`, it will
check if the new value is already contained in the list. If the value is found to be a 
duplicate it will not be added and the method will return `false`.

Values are checked using strict `===` comparison. Checking for duplicates inserts the list
into a [`Set`][set] and then checks if the value is contained in the set. 

```typescript
let items: number[] = [4, 5, 6, 7];
let list = new LinkedList<number>(...items);
list.length // => 4
let result = list.prepend(4, true)
list.length // => 4
list.head // => 4
result // => false
```

#### LinkedList<T>#removeHead(): T

Removes the item at the head of the list and returns the item.

```typescript
let items: number[] = [4, 5, 6, 7];
let list = new LinkedList<number>(...items);
list.length // => 4
let val = list.removeHead()
list.length // => 3
list.head // => 5
val // => 4
```

#### LinkedList<T>#removeTail(): T

Removes the item at the tail of the list and returns the item.

```typescript
let items: number[] = [4, 5, 6, 7];
let list = new LinkedList<number>(...items);
list.length // => 4
let val = list.removeTail()
list.length // => 3
list.tail // => 6
val // => 7
```

#### LinkedList<T>#remove(val: T): T

Removes the specified item from the list and returns the item for convenience. If the 
item can not be located in the list the method wil return undefined and the list will
not be altered.

```typescript
let items: number[] = [4, 5, 6, 7];
let list = new LinkedList<number>(...items);
list.length // => 4
let val = list.remove(6)
list.length // => 3
list.tail // => 7
val // => 6
```

```typescript
let items: number[] = [4, 5, 6, 7];
let list = new LinkedList<number>(...items);
list.length // => 4
let val = list.remove(8)
list.length // => 4
list.tail // => 7
val // => undefined
```

#### LinkedList<T>#toArray(): T[]

This method simply returns `[...this]`.

Converts the list into an array and returns the array representation. This method does
not mutate the list in any way.

Objects are not copied, so all non-primitive items in the array are still referencing
the list items.

```typescript
let items: number[] = [4, 5, 6, 7];
let list = new LinkedList<number>(...items);
let result = list.toArray()
result // => [4, 5, 6, 7]
```

## Attribution

This linked-list was originally shared by Christos Monogios via his [blog][blog]. The [original code][origcode] has been modified and extended to support typedef generics to allow for type checking on stored values for linked lists and iterable and iterator protocols.

## License

[MIT][license] © [Michael Sutherland][author]

<!-- Definitions -->

[travis-badge]: https://img.shields.io/travis/sfkiwi/linked-list-typescript.svg

[travis]: https://travis-ci.org/sfkiwi/linked-list-typescript

[coveralls-badge]: https://img.shields.io/coveralls/github/sfkiwi/linked-list-typescript.svg

[coveralls]: https://coveralls.io/github/sfkiwi/linked-list-typescript

[npm]: https://docs.npmjs.com/cli/install

[yarn]: https://yarnpkg.com/lang/en/docs/install/

[license]: LICENSE.md

[author]: http://github.com/sfkiwi

[wiki]: http://wikipedia.org/wiki/Linked_list

[set]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set

[blog]: https://christosmonogios.com/2016/10/29/Create-A-Linked-List-With-TypeScript/

[origcode]: https://github.com/ChristosMonogios/Code-From-My-Blog-Articles/blob/master/Linked-List-With-TypeScript/test.ts

[list]: https://www.npmjs.com/package/linked-list-typescript

[stack]: https://www.npmjs.com/package/stack-typescript

[queue]: https://www.npmjs.com/package/queue-typescript

[hashlist]: https://www.npmjs.com/package/hashlist-typescript