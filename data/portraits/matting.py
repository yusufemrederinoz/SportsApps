MODEL = "ZhengPeng7/BiRefNet"
INPUT_SIZE = 1024
MEAN = [0.485, 0.456, 0.406]
DEVIATION = [0.229, 0.224, 0.225]


def load_matting():
    from transformers import AutoModelForImageSegmentation

    model = AutoModelForImageSegmentation.from_pretrained(MODEL, trust_remote_code=True)
    return model.to("cuda").eval().half()


def subject_mask(model, image):
    import torch
    from torchvision import transforms

    prepare = transforms.Compose(
        [
            transforms.Resize((INPUT_SIZE, INPUT_SIZE)),
            transforms.ToTensor(),
            transforms.Normalize(MEAN, DEVIATION),
        ]
    )
    with torch.no_grad():
        prediction = model(prepare(image.convert("RGB")).unsqueeze(0).to("cuda").half())[-1].sigmoid()
    mask = transforms.ToPILImage()(prediction[0].squeeze().float().cpu())
    return mask.resize(image.size)
