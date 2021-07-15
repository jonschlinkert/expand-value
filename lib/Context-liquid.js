'use strict';

const isObject = v => v !== null && typeof v === 'object' && !Array.isArray(v);
let StrainerFactory;
let StackLevelError;
let Liquid;
let ResourceLimits;
let StaticRegisters;
let Template;
let ContextError;
let Expression;

const MAX_DEPTH = 100;
const kStrainer = Symbol('strainer');

// Context keeps the variable stack and resolves variables, as well as keywords
//
//   context['variable'] = 'testing'
//   context['variable'] //=> 'testing'
//   context['true']     //=> true
//   context['10.2232']  //=> 10.2232
//
//   context.stack do
//      context['bob'] = 'bobsen'
//   }
//
//   context['bob']  //=> null  class Context
class Context {
  static build({
    environments,
    outer_scope,
    registers,
    rethrow_errors,,
    resource_limits,,
    static_environments,
    callback
  }) {
    return new this(environments, outer_scope, registers, rethrow_errors, resource_limits, static_environments, callback);
  }

  constructor(
    environments = {},
    outer_scope = {},
    registers = {},
    rethrow_errors = false,
    resource_limits = null,
    static_environments = {}
  ) {
    this.environments = [environments].flat(Infinity);
    this.static_environments = [static_environments].flat(Infinity);
    this.scopes = [outer_scope || {}];
    this.registers = registers;
    this.errors = [];
    this.partial = false;
    this.strict_variables = false;
    this.resource_limits = resource_limits || new ResourceLimits(Template.default_resource_limits);
    this.base_scope_depth = 0;
    this.interrupts = [];
    this.filters = [];
    this.global_filter = null;
    this.disabled_tags = {};
    this.warnings ||= [];

    Context.exception_renderer = rethrow_errors
      ? Template.default_exception_renderer
      : Liquid.throw_EXCEPTION_LAMBDA;

    if (callback) callback(this);
    this.squash_instance_assigns_with_environments();
  }

  set strainer(value) {
    this[kStrainer] = value;
  }
  get strainer() {
    return (this[kStrainer] ||= StrainerFactory.create(this, this.filters));
  }

  // Adds filters to this scope.
  //
  // Note that this does not register the filters with the main Template object. see <tt>Template.register_filter</tt>
  // for that
  add_filters(filters) {
    this.filters.push(...[].concat(filters || []).flat().filter(Boolean));
    this.strainer = null;
  }

  apply_global_filter(obj) {
    return this.global_filter == null ? obj : this.global_filter(obj);
  }

  // are there any not handled interrupts?
  interrupt() {
    return this.interrupts.length > 0;
  }

  // push an interrupt to the stack. this interrupt is considered not handled.
  push_interrupt(e) {
    this.interrupts.push(e);
  }

  // pop an interrupt from the stack
  pop_interrupt() {
    this.interrupts.pop();
  }

  handle_error(e, line_number = null) {
    if (!(e instanceof Error)) e = this.internal_error();
    e.template_name ||= this.template_name;
    e.line_number ||= this.line_number;
    this.errors.push(e);
    return this.exception_renderer.call(e).toString();
  }

  invoke(method, ...args) {
    return this.strainer.invoke(method, ...args).to_liquid();
  }

  // Push new local scope on the stack. use <tt>Context//stack</tt> instead
  push(new_scope = {}) {
    this.scopes.unshift(new_scope);
    this.check_overflow();
  }

  // Merge a hash of variables in the current local scope
  merge(new_scopes) {
    Object.assign(this.scope, new_scopes);
  }

  // Pop from the stack. use <tt>Context//stack</tt> instead
  pop() {
    if (this.scopes.size === 1) throw new ContextError();
    this.scopes.shift();
  }

  // Pushes a new local scope on the stack, pops it at the } of the block
  //
  // Example:
  //   context.stack do
  //      context['var'] = 'hi'
  //   }
  //
  //   context['var]  //=> null
  stack(new_scope = {}, block) {
    try {
      this.push(new_scope);
      block();
    } catch (e) {
      console.log(e);
    } finally {
      this.pop();
    }
  }

  // Creates a new context inheriting resource limits, filters, environment etc.,
  // but with an isolated scope.
  new_isolated_subcontext() {
    this.check_overflow();

    const subcontext = Context.build({
      resource_limits: this.resource_limits,
      static_environments: this.static_environments,
      registers: new StaticRegisters(this.registers)
    });

    subcontext.base_scope_depth = this.base_scope_depth + 1;
    subcontext.exception_renderer = this.exception_renderer;
    subcontext.filters = this.filters;
    subcontext.strainer = null;
    subcontext.errors = this.errors;
    subcontext.warnings = this.warnings;
    subcontext.disabled_tags = this.disabled_tags;
    return subcontext;
  }

  clear_instance_assigns() {
    this.scopes[this.scopes.length - 1] = {};
  }

  // Only allow String, Numeric, Hash, Array, Proc, Boolean or <tt>Liquid.Drop</tt>
  set(key, value) {
    this.scope[key] = value;
  }

  // Look up variable, either resolve directly after considering the name.
  // We can directly handle Strings, digits, floats and booleans (true,false).
  // If no match is made we lookup the variable in the current scope and
  // later move up to the parent blocks to see if we can resolve the variable somewhere up the tree.
  // Some special keywords return symbols. Those symbols are to be called on the rhs object in expressions
  //
  // Example:
  //   products == empty //=> products.empty?
  get(expression) {
    return this.evaluate(Expression.parse(expression));
  }

  key(key) {
    return this[key] != null;
  }

  evaluate(object) {
    return object.evaluate ? object.evaluate(this) : object;
  }

  // Fetches an object starting at the local scope and then moving up the hierachy
  find_variable(key, { throw_on_not_found = true }) {
    // This was changed from find() to find_index() because this is a very hot
    // path and find_index() is optimized in MRI to reduce object allocation
    const index = this.scopes.findIndex(s => hasOwnProperty.call(s, key));

    let variable = (() => {
      if (index) {
        return this.lookup_and_evaluate(this.scopes[index], key, { throw_on_not_found });
      } else {
        return this.try_variable_find_in_environments(key, { throw_on_not_found });
      }
    })();

    variable = variable.to_liquid();
    if (variable.context) variable.context = this;
    return variable;
  }

  lookup_and_evaluate(obj, key, { throw_on_not_found = true }) {
    if (this.strict_variables && throw_on_not_found && isObject(obj) && !hasOwnProperty.call(obj, key)) {
      throw new Liquid.UndefinedVariable(`undefined variable ${key}`);
    }

    const value = obj[key];

    if (typeof value === 'function' && isObject(obj)) {
      obj[key] = value.length === 0 ? value.call(this) : value.call(this, this);
      return obj[key];
    }

    return value;
  }

  with_disabled_tags(tag_names, block) {
    for (const name of tag_names) {
      this.disabled_tags[name] = (this.disabled_tags[name] || 0) + 1;
    }

    try {
      block();
    } catch (err) {
      console.error(err);
    }

    for (const name of tag_names) {
      this.disabled_tags[name] -= 1;
    }
  }

  tag_disabled(tag_name) {
    return this.disabled_tags[tag_name] > 0;
  }

  try_variable_find_in_environments(key, { throw_on_not_found }) {
    const find = environments => {
      for (const env of environments) {
        const found = this.lookup_and_evaluate(env, key, { throw_on_not_found });
        if (found != null || (this.strict_variables && throw_on_not_found)) {
          return found;
        }
      }
    };
    return [find(this.environments), find(this.static_environments), null].find(v => v !== undefined);
  }

  check_overflow() {
    if (this.overflow()) {
      throw new StackLevelError('Nesting too deep');
    }
  }

  overflow() {
    return this.base_scope_depth + this.scopes.length > MAX_DEPTH;
  }

  internal_error() {
    throw Liquid.InternalError('internal');
  }

  squash_instance_assigns_with_environments() {
    const last = this.scopes[this.scopes.length - 1];

    for (const k of Object.keys(last)) {
      for (const env of this.environments) {
        if (hasOwnProperty.call(env, k)) {
          last[k] = this.lookup_and_evaluate(env, k);
          break;
        }
      }
    }
  }

  get scope() {
    return this.scopes[0];
  }
}

module.exports = Context;
