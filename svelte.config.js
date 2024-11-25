import adapter from "@sveltejs/adapter-node";
import { sveltePreprocess } from "svelte-preprocess";

export default {
    preprocess: sveltePreprocess(),

    kit: {
        adapter: adapter(),
    },

    compilerOptions: {
		runes: true
	}
};
