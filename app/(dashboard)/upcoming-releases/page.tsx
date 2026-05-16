import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function UpcomingReleases() {
  const releases = [
    {
      title: 'Black Bolt',
      date: '2025-08-22',
      setCodeImage: '/images/zsv10pt5_blk_symbol_38x38.png',
      image: '/images/sv10pt5-blk-banner.png', // Replace with your own image path
      titleImage: '/images/sv10pt5_blk_logo_en.png',
    },
    {
      title: 'White Flare',
      date: '2025-08-22',
      setCodeImage: '/images/rsv10pt5_wht_symbol_38x38.png',
      image: '/images/sv10pt5-wht-banner.png', // Replace with your own image path
      titleImage: '/images/sv10pt5_wht_logo_en.png',
    },
  ];

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <div className="grid grid-cols-1 gap-6 p-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-4xl">Pokémon</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-6">
                {releases.map((release, idx) => (
                  <Card
                    key={idx}
                    className="relative overflow-hidden group rounded-2xl shadow-lg border border-border"
                  >
                    {/* Background image */}
                    <div className="absolute inset-0 z-0 overflow-hidden">
                      <Image
                        src={release.image}
                        alt="background"
                        layout="fill"
                        objectFit="cover"
                        className="object-cover transition-transform duration-300 group-hover:scale-105 brightness-80"
                      />
                      <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-card dark:from-primary/20 dark:to-card transition duration-300" />
                    </div>

                    {/* Foreground content */}
                    <CardContent className="relative z-10 flex flex-col justify-end h-60 p-4">
                      <div className="absolute bottom-0 right-0 transition-transform duration-300 group-hover:scale-105 group-hover:brightness-125">
                        <Image
                          src={release.titleImage}
                          alt={release.title}
                          width={300}
                          height={100}
                          className="object-contain drop-shadow-lg"
                        />
                      </div>
                      <div className={`text-primary pt-2 drop-shadow-md`}>
                        <h3 className="text-xl font-semibold flex align-middle">
                          {release.title}
                          <Image
                            src={release.setCodeImage}
                            alt={release.setCodeImage}
                            width={38}
                            height={38}
                            className="object-contain pl-2"
                          />
                        </h3>
                        <p className="text-md">{release.date}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
