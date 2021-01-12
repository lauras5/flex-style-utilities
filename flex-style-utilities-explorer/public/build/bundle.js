
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function select_option(select, value) {
        for (let i = 0; i < select.options.length; i += 1) {
            const option = select.options[i];
            if (option.__value === value) {
                option.selected = true;
                return;
            }
        }
    }
    function select_value(select) {
        const selected_option = select.querySelector(':checked') || select.options[0];
        return selected_option && selected_option.__value;
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.31.2' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev('SvelteDOMSetProperty', { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/App.svelte generated by Svelte v3.31.2 */

    const file = "src/App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[13] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[16] = list[i];
    	return child_ctx;
    }

    // (27:4) {#each Array(numItems).fill(0).map((e, i) => i) as i}
    function create_each_block_1(ctx) {
    	let div;
    	let t0;
    	let t1;
    	let t2_value = /*i*/ ctx[16] + "";
    	let t2;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t0 = text(/*flexClass*/ ctx[1]);
    			t1 = text(" #");
    			t2 = text(t2_value);
    			attr_dev(div, "class", "item svelte-2vvj8j");
    			add_location(div, file, 27, 8, 790);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t0);
    			append_dev(div, t1);
    			append_dev(div, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*flexClass*/ 2) set_data_dev(t0, /*flexClass*/ ctx[1]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(27:4) {#each Array(numItems).fill(0).map((e, i) => i) as i}",
    		ctx
    	});

    	return block;
    }

    // (34:8) {#each classes as tmpClass}
    function create_each_block(ctx) {
    	let option;
    	let t_value = /*tmpClass*/ ctx[13] + "";
    	let t;
    	let option_value_value;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = option_value_value = /*tmpClass*/ ctx[13];
    			option.value = option.__value;
    			add_location(option, file, 34, 12, 958);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*classes*/ 1 && t_value !== (t_value = /*tmpClass*/ ctx[13] + "")) set_data_dev(t, t_value);

    			if (dirty & /*classes*/ 1 && option_value_value !== (option_value_value = /*tmpClass*/ ctx[13])) {
    				prop_dev(option, "__value", option_value_value);
    				option.value = option.__value;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(34:8) {#each classes as tmpClass}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let link;
    	let t0;
    	let div0;
    	let div0_class_value;
    	let t1;
    	let div1;
    	let select0;
    	let t2;
    	let select1;
    	let option0;
    	let option1;
    	let option2;
    	let option3;
    	let t6;
    	let select2;
    	let option4;
    	let option5;
    	let option6;
    	let t9;
    	let select3;
    	let option7;
    	let option8;
    	let option9;
    	let mounted;
    	let dispose;
    	let each_value_1 = Array(/*numItems*/ ctx[5]).fill(0).map(func);
    	validate_each_argument(each_value_1);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	let each_value = /*classes*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			link = element("link");
    			t0 = space();
    			div0 = element("div");

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t1 = space();
    			div1 = element("div");
    			select0 = element("select");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t2 = space();
    			select1 = element("select");
    			option0 = element("option");
    			option1 = element("option");
    			option1.textContent = "flex--space-between";
    			option2 = element("option");
    			option2.textContent = "flex--space-around";
    			option3 = element("option");
    			option3.textContent = "flex--space-evenly";
    			t6 = space();
    			select2 = element("select");
    			option4 = element("option");
    			option5 = element("option");
    			option5.textContent = "flex--baseline";
    			option6 = element("option");
    			option6.textContent = "flex--stretch";
    			t9 = space();
    			select3 = element("select");
    			option7 = element("option");
    			option8 = element("option");
    			option8.textContent = "flex--wrap";
    			option9 = element("option");
    			option9.textContent = "flex--wrap-reverse";
    			attr_dev(link, "rel", "stylesheet");
    			attr_dev(link, "href", "./flex-style-utilities.css");
    			add_location(link, file, 22, 4, 582);
    			attr_dev(div0, "class", div0_class_value = "page " + /*flexClass*/ ctx[1] + " " + /*justClass*/ ctx[2] + " " + /*alignClass*/ ctx[3] + " " + /*wrapClass*/ ctx[4] + " svelte-2vvj8j");
    			add_location(div0, file, 25, 0, 656);
    			if (/*flexClass*/ ctx[1] === void 0) add_render_callback(() => /*select0_change_handler*/ ctx[6].call(select0));
    			add_location(select0, file, 32, 4, 878);
    			option0.__value = "";
    			option0.value = option0.__value;
    			add_location(option0, file, 39, 8, 1061);
    			option1.__value = "flex--space-between";
    			option1.value = option1.__value;
    			add_location(option1, file, 40, 8, 1087);
    			option2.__value = "flex--space-around";
    			option2.value = option2.__value;
    			add_location(option2, file, 41, 8, 1132);
    			option3.__value = "flex--space-evenly";
    			option3.value = option3.__value;
    			add_location(option3, file, 42, 8, 1176);
    			if (/*justClass*/ ctx[2] === void 0) add_render_callback(() => /*select1_change_handler*/ ctx[7].call(select1));
    			add_location(select1, file, 38, 4, 1021);
    			option4.__value = "";
    			option4.value = option4.__value;
    			add_location(option4, file, 46, 8, 1272);
    			option5.__value = "flex--baseline";
    			option5.value = option5.__value;
    			add_location(option5, file, 47, 8, 1298);
    			option6.__value = "flex--stretch";
    			option6.value = option6.__value;
    			add_location(option6, file, 48, 8, 1338);
    			if (/*alignClass*/ ctx[3] === void 0) add_render_callback(() => /*select2_change_handler*/ ctx[8].call(select2));
    			add_location(select2, file, 45, 4, 1231);
    			option7.__value = "";
    			option7.value = option7.__value;
    			add_location(option7, file, 52, 8, 1428);
    			option8.__value = "flex--wrap";
    			option8.value = option8.__value;
    			add_location(option8, file, 53, 8, 1454);
    			option9.__value = "flex--wrap-reverse";
    			option9.value = option9.__value;
    			add_location(option9, file, 54, 8, 1490);
    			if (/*wrapClass*/ ctx[4] === void 0) add_render_callback(() => /*select3_change_handler*/ ctx[9].call(select3));
    			add_location(select3, file, 51, 4, 1388);
    			attr_dev(div1, "class", "controls svelte-2vvj8j");
    			add_location(div1, file, 31, 0, 851);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			append_dev(document.head, link);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div0, anchor);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(div0, null);
    			}

    			insert_dev(target, t1, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, select0);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(select0, null);
    			}

    			select_option(select0, /*flexClass*/ ctx[1]);
    			append_dev(div1, t2);
    			append_dev(div1, select1);
    			append_dev(select1, option0);
    			append_dev(select1, option1);
    			append_dev(select1, option2);
    			append_dev(select1, option3);
    			select_option(select1, /*justClass*/ ctx[2]);
    			append_dev(div1, t6);
    			append_dev(div1, select2);
    			append_dev(select2, option4);
    			append_dev(select2, option5);
    			append_dev(select2, option6);
    			select_option(select2, /*alignClass*/ ctx[3]);
    			append_dev(div1, t9);
    			append_dev(div1, select3);
    			append_dev(select3, option7);
    			append_dev(select3, option8);
    			append_dev(select3, option9);
    			select_option(select3, /*wrapClass*/ ctx[4]);

    			if (!mounted) {
    				dispose = [
    					listen_dev(select0, "change", /*select0_change_handler*/ ctx[6]),
    					listen_dev(select1, "change", /*select1_change_handler*/ ctx[7]),
    					listen_dev(select2, "change", /*select2_change_handler*/ ctx[8]),
    					listen_dev(select3, "change", /*select3_change_handler*/ ctx[9])
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*Array, numItems, flexClass*/ 34) {
    				each_value_1 = Array(/*numItems*/ ctx[5]).fill(0).map(func);
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_1[i] = create_each_block_1(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(div0, null);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}

    				each_blocks_1.length = each_value_1.length;
    			}

    			if (dirty & /*flexClass, justClass, alignClass, wrapClass, classes*/ 31 && div0_class_value !== (div0_class_value = "page " + /*flexClass*/ ctx[1] + " " + /*justClass*/ ctx[2] + " " + /*alignClass*/ ctx[3] + " " + /*wrapClass*/ ctx[4] + " svelte-2vvj8j")) {
    				attr_dev(div0, "class", div0_class_value);
    			}

    			if (dirty & /*classes*/ 1) {
    				each_value = /*classes*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(select0, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty & /*flexClass, classes*/ 3) {
    				select_option(select0, /*flexClass*/ ctx[1]);
    			}

    			if (dirty & /*justClass*/ 4) {
    				select_option(select1, /*justClass*/ ctx[2]);
    			}

    			if (dirty & /*alignClass*/ 8) {
    				select_option(select2, /*alignClass*/ ctx[3]);
    			}

    			if (dirty & /*wrapClass*/ 16) {
    				select_option(select3, /*wrapClass*/ ctx[4]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			detach_dev(link);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div0);
    			destroy_each(each_blocks_1, detaching);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div1);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const func = (e, i) => i;

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	const directions = ["row", "col", "rrow", "rcol"];
    	const vOrientations = ["t", "c", "b"];
    	const hOrientations = ["l", "c", "r"];
    	let classes = [];

    	for (const direction of directions) {
    		for (const vOrient of vOrientations) {
    			for (const hOrient of hOrientations) {
    				classes = [...classes, `flex-${direction}--${vOrient}${hOrient}`];
    			}
    		}
    	}

    	let flexClass = classes[0];
    	let justClass = "";
    	let alignClass = "";
    	let wrapClass = "";
    	let numItems = 3;
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function select0_change_handler() {
    		flexClass = select_value(this);
    		$$invalidate(1, flexClass);
    		$$invalidate(0, classes);
    	}

    	function select1_change_handler() {
    		justClass = select_value(this);
    		$$invalidate(2, justClass);
    	}

    	function select2_change_handler() {
    		alignClass = select_value(this);
    		$$invalidate(3, alignClass);
    	}

    	function select3_change_handler() {
    		wrapClass = select_value(this);
    		$$invalidate(4, wrapClass);
    	}

    	$$self.$capture_state = () => ({
    		directions,
    		vOrientations,
    		hOrientations,
    		classes,
    		flexClass,
    		justClass,
    		alignClass,
    		wrapClass,
    		numItems
    	});

    	$$self.$inject_state = $$props => {
    		if ("classes" in $$props) $$invalidate(0, classes = $$props.classes);
    		if ("flexClass" in $$props) $$invalidate(1, flexClass = $$props.flexClass);
    		if ("justClass" in $$props) $$invalidate(2, justClass = $$props.justClass);
    		if ("alignClass" in $$props) $$invalidate(3, alignClass = $$props.alignClass);
    		if ("wrapClass" in $$props) $$invalidate(4, wrapClass = $$props.wrapClass);
    		if ("numItems" in $$props) $$invalidate(5, numItems = $$props.numItems);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		classes,
    		flexClass,
    		justClass,
    		alignClass,
    		wrapClass,
    		numItems,
    		select0_change_handler,
    		select1_change_handler,
    		select2_change_handler,
    		select3_change_handler
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
