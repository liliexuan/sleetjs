import { parse } from './parser'
import { Context } from './context'
import { NodeType, SleetNode, Declaration, Tag } from './ast'

export * from './ast'
export { Context, parse }

export interface SleetOutput {
    code: string
    mapping?: string
    extension?: string
}

export interface Location {
    start: {offset: number, line: number, column: number}
    end: {offset: number, line: number, column: number}
}

export interface Compiler {
    compile (context: Context): void
}

export interface CompilerFactory {
    type: NodeType
    new (...args: any[]): Compiler
    create (node: SleetNode, stack: SleetNode[]): Compiler | undefined
}

export interface CompileResult {
    nodes: Tag[]
    indent: string
    declaration: Declaration
}

export interface SleetPlugin {
    prepare? (context: Context): void
    compile (input: CompileResult, options: SleetOptions, context: Context): SleetOutput
}

export interface SleetOptions {
    plugins?: {[name: string]: SleetPlugin}
    defaultPlugin?: string | SleetPlugin
    pluginOptions?: {[name: string]: any}
    sourceFile?: string
    newLineToken?: string
    compile? (input: CompileResult, options: SleetOptions): SleetOutput
}

export function compile(input: string, options: SleetOptions): SleetOutput {
    const result = parse(input)
    if (options.compile) {
        return options.compile(result, options)
    }

    let name: string | SleetPlugin = ''
    if (result.declaration) {
        name = result.declaration.name
    }

    if (!name && options.defaultPlugin) name = options.defaultPlugin
    if (name && typeof name === 'string' && options.plugins && options.plugins[name]) {
        name = options.plugins[name]
    }

    if (!name) name = 'html'
    if (name && typeof name === 'string') {
        if (name.slice(0, 6) === 'sleet-') name = name.slice(6)
        const o = require(name)
        name = o.plugin
    }

    const context = new Context(options, 0, result.indent, options.newLineToken || '\n')
    const plugin = name as SleetPlugin
    if (plugin.prepare) plugin.prepare(context)
    return plugin.compile(result, options, context)
}
