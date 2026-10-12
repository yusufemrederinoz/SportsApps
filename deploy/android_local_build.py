import json
import os
import pathlib
import re
import shutil
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
APP = ROOT / "app"
ANDROID = APP / "android"
SECRETS = pathlib.Path.home() / ".challengegoal"
OUTPUT = ROOT / "data" / "build" / "store" / "submission" / "google-play"
API_URL = "https://api.challengegoal.app"
VERSION_CODE = re.compile(r"versionCode \d+")
VERSION_NAME = re.compile(r'versionName "([^"]+)"')


def tool_environment():
    tools = pathlib.Path(os.environ.get("LOCALAPPDATA", pathlib.Path.home())) / "Android"
    environment = os.environ.copy()
    environment.setdefault("JAVA_HOME", str(tools / "jdk-17"))
    environment.setdefault("ANDROID_HOME", str(tools / "Sdk"))
    environment.update({"EXPO_PUBLIC_API_URL": API_URL, "NODE_ENV": "production", "EXPO_NO_GIT_STATUS": "1"})
    return environment


def signing_environment():
    keystore = json.loads((SECRETS / "android-credentials.json").read_text(encoding="utf-8"))["android"]["keystore"]
    prefix = "ORG_GRADLE_PROJECT_android.injected.signing"
    return {
        f"{prefix}.store.file": str(SECRETS / "android-upload-keystore.jks"),
        f"{prefix}.store.password": keystore["keystorePassword"],
        f"{prefix}.key.alias": keystore["keyAlias"],
        f"{prefix}.key.password": keystore["keyPassword"],
    }


def main():
    version_code = int(sys.argv[1])
    environment = tool_environment()
    package = APP / "package.json"
    original = package.read_bytes()
    try:
        subprocess.run(
            [shutil.which("npx"), "expo", "prebuild", "--platform", "android", "--clean", "--no-install"],
            cwd=APP,
            env=environment,
            check=True,
        )
    finally:
        package.write_bytes(original)

    gradle = ANDROID / "app" / "build.gradle"
    script = gradle.read_text(encoding="utf-8")
    version_name = VERSION_NAME.search(script).group(1)
    gradle.write_text(VERSION_CODE.sub(f"versionCode {version_code}", script, count=1), encoding="utf-8")

    wrapper = ANDROID / ("gradlew.bat" if os.name == "nt" else "gradlew")
    subprocess.run(
        [str(wrapper), "bundleRelease", "--console=plain"],
        cwd=ANDROID,
        env={**environment, **signing_environment()},
        check=True,
    )

    OUTPUT.mkdir(parents=True, exist_ok=True)
    target = OUTPUT / f"challengegoal-{version_name}-{version_code}.aab"
    shutil.copyfile(ANDROID / "app" / "build" / "outputs" / "bundle" / "release" / "app-release.aab", target)
    print(target)


if __name__ == "__main__":
    main()
