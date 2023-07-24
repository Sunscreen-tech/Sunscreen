# Change Log

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com)
and this project adheres to [Semantic Versioning](http://semver.org).

## [0.1.3](https://github.com/remarkablemark/html-dom-parser/compare/v0.1.2...v0.1.3) - 2018-02-20
### Fixed
- Fix regular expression vulnerability (#8)
  - Regex has potential for catastrophic backtracking
  - Credit goes to @davisjam for discovering it

### Changed
- Refactored and updated tests (#8)

## [0.1.2](https://github.com/remarkablemark/html-dom-parser/compare/v0.1.1...v0.1.2) - 2017-09-30
### Added
- Create helper `isIE()` in utilities (#7)

### Fixed
- Fix client parser in IE/IE9 (#6, #7)

### Changed
- Upgrade `mocha@3.4.2` and `webpack@2.6.1` (#5)
- npm script `build` runs both `build:min` and `build:unmin` (#5)

## [0.1.1](https://github.com/remarkablemark/html-dom-parser/compare/v0.1.0...v0.1.1) - 2017-06-26
### Added
- CHANGELOG with previous releases backfilled

### Fixed
- Fix client parser on IE by specifying required parameter for `createHTMLDocument` (#4)

## [0.1.0](https://github.com/remarkablemark/html-dom-parser/compare/v0.0.2...v0.1.0) - 2017-06-17
### Changed
- Improve, refactor, and optimize client parser
  - Use `template`, `DOMImplementation`, and/or `DOMParser`

## [0.0.2](https://github.com/remarkablemark/html-dom-parser/compare/v0.0.1...v0.0.2) - 2016-10-10
### Added
- Create npm scripts for prepublish

### Changed
- Change webpack to build to UMD target
- Update README installation and usage instructions

## [0.0.1](https://github.com/remarkablemark/html-dom-parser/tree/v0.0.1) - 2016-10-10
### Added
- Server parser
  - Wrapper for `htmlparser2.parseDOM`
- Client parser
  - Uses DOM API to mimic server parser output
  - Build client library with webpack
- Add README, tests, and other necessary files
