<!-- Copyright (C) 2025 Ellie Hartung

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>. -->

<script lang="ts">
    import Desktop from "$lib/desktop.svelte";
</script>

<svelte:head>
    <title>liminal.moe - personal site of Ellie Hartung</title>
    <meta name="description" content="Hello! I'm 1vers1on (Ellie Hartung) — Developer and Electrical Engineer working on C++, Java, and web projects. Browse projects, contact info, and experiments." />
    <link rel="canonical" href="https://liminal.moe/" />

    <!-- Open Graph -->
    <meta property="og:site_name" content="1vers1on" />
    <meta property="og:title" content="1vers1on — Ellie Hartung" />
    <meta property="og:description" content="Hello! I'm 1vers1on (Ellie Hartung) — Developer and Electrical Engineer working on C++, Java, and web projects." />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://liminal.moe/" />

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="@1vers1on" />
    <meta name="twitter:title" content="1vers1on — Ellie Hartung" />
    <meta name="twitter:description" content="Hello! I'm 1vers1on (Ellie Hartung) — Developer and Electrical Engineer working on C++, Java, and web projects." />

    <!-- Structured data: Person -->
    <script type="application/ld+json">
        {`{
            "@context": "https://schema.org",
            "@type": "Person",
            "name": "Ellie Hartung",
            "alternateName": "1vers1on",
            "url": "https://liminal.moe/",
            "sameAs": [
                "https://github.com/1vers1on"
            ],
            "jobTitle": "Developer",
            "description": "Developer and Electrical Engineer working on C++, Java, and web projects."
        }`}
    </script>
</svelte:head>

<Desktop />
