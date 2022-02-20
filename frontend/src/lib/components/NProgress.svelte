<script lang="ts">
    import { afterNavigate, beforeNavigate } from '$app/navigation';
    import nprogress from 'nprogress';

    let timeout: NodeJS.Timeout;

    function start() {
        clearTimeout(timeout);
        timeout = setTimeout(() => nprogress.start(), 100);
    }

    function done() {
        clearTimeout(timeout);
        nprogress.done();
    }

    beforeNavigate(() => {
        start();
    });

    // lol svelte is too quick, I rarely see this thing after inital load of a page
    afterNavigate(() => {
        done();
        // setTimeout(done, 50);
    });
</script>
