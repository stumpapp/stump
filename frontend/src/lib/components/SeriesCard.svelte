<script lang="ts">
    import api from '@lib/api';

    export let series: Series;
</script>

<a href={`/series/${series.id}`} class="col-span-1 rounded-md bg-gray-800">
    <!-- on:error={(err) => console.log({ series, err })} -->
    <!-- on:error={(err) => loadError = true} -->
    <!-- TODO: figure out why this was not working, causing multiple to fail
      when in reality only one failed -->

    <div
        class="hover:border-brand rounded-t-md border border-transparent px-1.5 transition-all duration-200"
    >
        <!-- Trying to keep the 3:2 aspect ratio of comic books -->
        <img
            id={String(series.id)}
            alt="{series.title} thumbnail"
            class="h-72 w-auto max-w-[12rem] object-scale-down"
            src={api.series.getSeriesThumbnail(series.id)}
            on:error={(err) => {
                // TODO: does not work after reload. Will load the alt
                // @ts-ignore: TODO add fallback
                err.target.src = '/favicon.png';
            }}
        />
    </div>

    <div class="p-2">
        <h3 class="text-gray-100">{series.title}</h3>
        <p class="text-gray-100">{series.book_count} books</p>
    </div>
</a>
