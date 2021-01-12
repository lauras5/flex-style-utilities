<script>
    const directions = ['row', 'col', 'rrow', 'rcol'];
    const vOrientations = ['t', 'c', 'b'];
    const hOrientations = ['l', 'c', 'r'];

    let classes = [];
    for (const direction of directions) {
        for (const vOrient of vOrientations) {
            for (const hOrient of hOrientations) {
                classes = [...classes, `flex-${direction}--${vOrient}${hOrient}`]
            }
        }
    }

    let flexClass = classes[0];
    let justClass = '';
    let alignClass = '';
    let wrapClass = '';
    let numItems = 3;
</script>

<svelte:head>
    <link rel="stylesheet" href="./flex-style-utilities.css">
</svelte:head>

<div class="page {flexClass} {justClass} {alignClass} {wrapClass}">
    {#each Array(numItems).fill(0).map((e, i) => i) as i}
        <div class="item">{flexClass} #{i}</div>
    {/each}
</div>

<div class="controls">
    <select bind:value={flexClass}>
        {#each classes as tmpClass}
            <option>{tmpClass}</option>
        {/each}
    </select>

    <select bind:value={justClass}>
        <option></option>
        <option>flex--space-between</option>
        <option>flex--space-around</option>
        <option>flex--space-evenly</option>
    </select>

    <select bind:value={alignClass}>
        <option></option>
        <option>flex--baseline</option>
        <option>flex--stretch</option>
    </select>

    <select bind:value={wrapClass}>
        <option></option>
        <option>flex--wrap</option>
        <option>flex--wrap-reverse</option>
    </select>
</div>

<style>
    .controls {
        position: fixed;
        bottom: 0;
        right: 0;
        height: 200px;
        width: 200px;
        background-color: rgba(0,0,0,.5);
    }
    .page {
        height: 100vh;
        border-bottom: 1px solid black;
    }

    .item {
        margin: 32px;
        box-shadow: 2px 2px 4px rgba(0, 0, 0, .5);
        background: beige;
    }
</style>
